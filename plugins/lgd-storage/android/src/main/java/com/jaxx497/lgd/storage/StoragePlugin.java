package com.jaxx497.lgd.storage;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

// Copies a finished download out of the app cache into a place the user can reach: the public
// Downloads folder (MediaStore, no permission needed) or a folder picked through the system
// picker (which stays granted across restarts).
@CapacitorPlugin(name = "Storage")
public class StoragePlugin extends Plugin {

    private static final int GRANT =
        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;

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
