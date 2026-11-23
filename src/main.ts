import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    })

    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5179')
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.on('save-image', (event) => {
    const webContents = event.sender;
    webContents.send('request-canvas-data');
});

ipcMain.on('print-image', (event) => {
    const webContents = event.sender;
    webContents.print({ silent: false, printBackground: true });
});

ipcMain.on('save-canvas-data', async (event, data: string) => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save Image',
        defaultPath: 'painting.png',
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'webp'] }]
    });

    if (filePath) {
        try {
            const buffer = Buffer.from(data, 'base64');
            fs.writeFileSync(filePath, buffer);
            event.reply('save-success', true);
        } catch (err: unknown) {
            console.error('Failed to save image:', err);
            event.reply('save-success', false);
        }
    } else {
        event.reply('save-success', false);
    }
});

// Windows WIA Scanner Integration
ipcMain.handle('scan-image', async () => {
    const tempPngPath = path.join(app.getPath('temp'), `scan_${Date.now()}.png`);
    const tempPs1Path = path.join(app.getPath('temp'), `scan_${Date.now()}.ps1`);

    const psScript = `
$tempFile = "${tempPngPath.replace(/\\/g, '\\\\')}"
try {
    $dialog = New-Object -ComObject WIA.CommonDialog
    # Show WIA scanner dialog: DeviceType=1, Intent=0, Bias=1, FormatID=PNG
    $image = $dialog.ShowAcquireImage(1, 0, 1, "{B963813F-112F-410E-8B61-D0CEC6E103F8}", $true, $false, $false)
    if ($image) {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
        $image.SaveFile($tempFile)
        Write-Output "SUCCESS"
    } else {
        Write-Output "ERROR|Scan cancelled by user."
    }
} catch { // no-op
    Write-Output "ERROR|$($_.Exception.Message)"
}
`;

    try {
        fs.writeFileSync(tempPs1Path, psScript, 'utf8');
    } catch (e: unknown) {
        const error = e instanceof Error ? e.message : String(e);
        return { error: `Failed to create scanner scripts: ${error}` };
    }

    return new Promise((resolve) => {
        exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs1Path}"`, (error, stdout) => {
            // Clean up the temporary PowerShell script
            try {
                if (fs.existsSync(tempPs1Path)) fs.unlinkSync(tempPs1Path);
            } catch { // intentionally ignored (open dialog cancelled above)
            }

            if (error) {
                const err = error instanceof Error ? error.message : String(error);
                console.error('PowerShell Process Error:', err);
                resolve({ error: err });
                return;
            }

            const output = stdout.trim();
            if (output.startsWith('SUCCESS')) {
                try {
                    if (fs.existsSync(tempPngPath)) {
                        const fileBuffer = fs.readFileSync(tempPngPath);
                        const base64Data = fileBuffer.toString('base64');
                        fs.unlinkSync(tempPngPath); // Clean up the temp image
                        resolve(`data:image/png;base64,${base64Data}`);
                    } else {
                        resolve({ error: 'Scanned file was not found on disk.' });
                    }
                } catch (readErr: unknown) {
                    const err = readErr instanceof Error ? readErr.message : String(readErr);
                    resolve({ error: `Read error: ${err}` });
                }
            } else if (output.startsWith('ERROR|')) {
                const errMsg = output.substring(6);
                resolve({ error: errMsg });
            } else {
                resolve({ error: output || 'No scanner device detected or scan timed out.' });
            }
        });
    });
});


