package com.jaxx497.libgendl.storage;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.SystemClock;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

// Downloads a file into the app cache (resuming dropped connections, stoppable), then copies it out
// into a place the user can reach: the public Downloads folder (MediaStore, no permission needed)
// or a folder picked through the system picker (which stays granted across restarts).
@CapacitorPlugin(
    name = "Storage",
    permissions = @Permission(alias = "storage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
)
public class StoragePlugin extends Plugin {

    private static final int GRANT =
        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;

    // Foreground service while downloads run (see DownloadService). The app must be on screen when
    // this is called, which it is: it follows the tap that queues a download.
    @PluginMethod
    public void startKeepAlive(PluginCall call) {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            // ponytail: fire and forget. Denied just hides the notification; the service still keeps the app alive.
            ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 0);
        }
        Intent intent = new Intent(getContext(), DownloadService.class);
        intent.putExtra("text", call.getString("text", "Downloading"));
        intent.putExtra("percent", call.getInt("percent", -1));
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void stopKeepAlive(PluginCall call) {
        getContext().stopService(new Intent(getContext(), DownloadService.class));
        call.resolve();
    }

    private static final int ATTEMPTS = 5;

    // One download's state. A stopped one may still be blocked in a connect for a while; its own
    // flag keeps it from touching the next download once the queue has moved on.
    private static final class Job {
        final String url;
        final File file;
        final String label;
        final String agent;
        volatile boolean stopped;
        volatile HttpURLConnection connection;

        Job(PluginCall call) {
            url = call.getString("url");
            file = new File(Uri.parse(call.getString("path")).getPath());
            label = call.getString("label", "Downloading");
            agent = call.getString("userAgent");
        }
    }

    private volatile Job job; // the running one (the queue is serial)

    @PluginMethod
    public void download(PluginCall call) {
        // Android 9 and older: publish() writes into the public Downloads folder directly. Ask now,
        // while the app is on screen, not when the download finishes.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermission");
            return;
        }
        startDownload(call);
    }

    // Denied: download anyway; publishing to Downloads then fails with the reason on the card.
    @PermissionCallback
    private void storagePermission(PluginCall call) {
        startDownload(call);
    }

    // Resolves at once; the download's own call rejects with "Stopped".
    @PluginMethod
    public void stopDownload(PluginCall call) {
        Job stopping = job;
        if (stopping != null) {
            stopping.stopped = true;
            HttpURLConnection http = stopping.connection;
            if (http != null) {
                new Thread(http::disconnect).start(); // unblocks a read waiting on the network
            }
        }
        call.resolve();
    }

    private void startDownload(PluginCall call) {
        Job current = new Job(call);
        job = current;

        // Its own thread: the plugin thread is shared by every plugin call, stopDownload included.
        new Thread(() -> {
            try {
                fetch(current);
                call.resolve();
            } catch (Exception exception) {
                current.file.delete();
                call.reject(current.stopped ? "Stopped" : String.valueOf(exception.getMessage()));
            }
        }).start();
    }

    // A dropped or stalled connection is retried, resuming where it stopped when the server honors
    // Range requests (and starting over when it doesn't).
    private void fetch(Job current) throws IOException, InterruptedException {
        current.file.delete();
        IOException last = null;
        for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
            if (attempt > 0) {
                Thread.sleep(3000);
            }
            if (current.stopped) {
                throw new IOException("Stopped");
            }
            try {
                transfer(current);
                return;
            } catch (IOException exception) {
                last = exception;
            }
        }
        throw last;
    }

    private void transfer(Job current) throws IOException {
        long offset = current.file.length();
        HttpURLConnection http = open(current, offset);
        try {
            int code = http.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK && code != HttpURLConnection.HTTP_PARTIAL) {
                throw new IOException("HTTP " + code);
            }
            boolean resumed = code == HttpURLConnection.HTTP_PARTIAL;
            if (!resumed) {
                offset = 0;
            }
            long length = http.getContentLengthLong();
            long total = length < 0 ? -1 : offset + length;

            try (InputStream in = http.getInputStream(); OutputStream out = new FileOutputStream(current.file, resumed)) {
                byte[] buffer = new byte[64 * 1024];
                long bytes = offset;
                long reported = 0;
                int read;
                while ((read = in.read(buffer)) != -1) {
                    if (current.stopped) {
                        throw new IOException("Stopped");
                    }
                    out.write(buffer, 0, read);
                    bytes += read;
                    long now = SystemClock.elapsedRealtime();
                    if (now - reported >= 500) {
                        reported = now;
                        report(current, bytes, total);
                    }
                }
                report(current, bytes, total);
                if (total >= 0 && bytes < total) {
                    throw new IOException("Connection closed early");
                }
            }
        } finally {
            http.disconnect();
        }
    }

    // Follows redirects by hand: HttpURLConnection won't follow one that switches http <-> https.
    private HttpURLConnection open(Job current, long offset) throws IOException {
        URL target = new URL(current.url);
        for (int hop = 0; hop < 5; hop++) {
            if (current.stopped) {
                throw new IOException("Stopped");
            }
            HttpURLConnection http = (HttpURLConnection) target.openConnection();
            current.connection = http;
            http.setInstanceFollowRedirects(false);
            http.setConnectTimeout(30_000);
            http.setReadTimeout(60_000);
            if (current.agent != null) {
                http.setRequestProperty("User-Agent", current.agent);
            }
            if (offset > 0) {
                http.setRequestProperty("Range", "bytes=" + offset + "-");
            }
            int code = http.getResponseCode();
            String location = http.getHeaderField("Location");
            if (code < 300 || code >= 400 || location == null) {
                return http;
            }
            http.disconnect();
            target = new URL(target, location);
        }
        throw new IOException("Too many redirects");
    }

    // To the page (throttled with the app in the background, so it can lag) and to the notification,
    // which doesn't depend on the page. A stopped download reports nothing.
    private void report(Job current, long bytes, long total) {
        if (current.stopped) {
            return;
        }
        JSObject status = new JSObject();
        status.put("bytes", bytes);
        status.put("total", total);
        notifyListeners("downloadProgress", status);

        int percent = total > 0 ? (int) (bytes * 100 / total) : -1;
        DownloadService.update(current.label, percent);
    }

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(GRANT | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "pickFolderResult");
    }

    @ActivityCallback
    private void pickFolderResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.reject("No folder chosen");
            return;
        }
        Uri tree = data.getData();
        getContext().getContentResolver().takePersistableUriPermission(tree, GRANT);

        // "primary:Download/Books" -> "Download/Books"
        String name = DocumentsContract.getTreeDocumentId(tree);
        name = name.substring(name.indexOf(':') + 1);
        JSObject ret = new JSObject();
        ret.put("uri", tree.toString());
        ret.put("name", name.isEmpty() ? "Internal storage" : name);
        call.resolve(ret);
    }

    @PluginMethod
    public void publish(PluginCall call) {
        String path = call.getString("path");
        String name = call.getString("name");
        String mime = call.getString("mime", "application/octet-stream");
        String tree = call.getString("tree");

        getBridge().execute(() -> {
            try {
                File source = new File(Uri.parse(path).getPath());
                ContentResolver resolver = getContext().getContentResolver();

                Uri destination;
                if (tree != null) {
                    Uri treeUri = Uri.parse(tree);
                    Uri parent = DocumentsContract.buildDocumentUriUsingTree(
                        treeUri,
                        DocumentsContract.getTreeDocumentId(treeUri)
                    );
                    destination = DocumentsContract.createDocument(resolver, parent, mime, name);
                } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                    // Android 9 and older have no MediaStore.Downloads: write straight into the
                    // public folder (WRITE_EXTERNAL_STORAGE was granted before the download).
                    File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    dir.mkdirs();
                    int dot = name.lastIndexOf('.');
                    String base = dot > 0 ? name.substring(0, dot) : name;
                    String extension = dot > 0 ? name.substring(dot) : "";
                    File target = new File(dir, name);
                    for (int copy = 1; target.exists(); copy++) {
                        target = new File(dir, base + " (" + copy + ")" + extension);
                    }
                    try (InputStream in = new FileInputStream(source); OutputStream out = new FileOutputStream(target)) {
                        pipe(in, out);
                    }
                    source.delete();

                    JSObject legacy = new JSObject();
                    legacy.put("uri", Uri.fromFile(target).toString());
                    call.resolve(legacy);
                    return;
                } else {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    destination = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                }
                if (destination == null) {
                    throw new IOException("Couldn't create the file");
                }

                try (
                    InputStream in = new FileInputStream(source);
                    OutputStream out = resolver.openOutputStream(destination)
                ) {
                    pipe(in, out);
                }
                source.delete();

                JSObject ret = new JSObject();
                ret.put("uri", destination.toString());
                call.resolve(ret);
            } catch (Exception exception) {
                call.reject(exception.getMessage(), exception);
            }
        });
    }

    private static void pipe(InputStream in, OutputStream out) throws IOException {
        byte[] buffer = new byte[64 * 1024];
        int read;
        while ((read = in.read(buffer)) != -1) {
            out.write(buffer, 0, read);
        }
    }
}
