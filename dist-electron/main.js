import { BrowserWindow as e, app as t, dialog as n, ipcMain as r } from "electron";
import i from "path";
import a from "fs";
import { fileURLToPath as o } from "url";
import { exec as s } from "child_process";
//#region src/main.ts
var c = o(import.meta.url), l = i.dirname(c);
function u() {
	let t = new e({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: i.join(l, "preload.js"),
			nodeIntegration: !1,
			contextIsolation: !0
		}
	});
	process.env.NODE_ENV === "development" ? t.loadURL("http://localhost:5179") : t.loadFile(i.join(l, "../dist/index.html"));
}
t.whenReady().then(u), t.on("window-all-closed", () => {
	process.platform !== "darwin" && t.quit();
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && u();
}), r.on("save-image", (e) => {
	e.sender.send("request-canvas-data");
}), r.on("print-image", (e) => {
	e.sender.print({
		silent: !1,
		printBackground: !0
	});
}), r.on("save-canvas-data", async (e, t) => {
	let { filePath: r } = await n.showSaveDialog({
		title: "Save Image",
		defaultPath: "painting.png",
		filters: [{
			name: "Images",
			extensions: [
				"png",
				"jpg",
				"webp"
			]
		}]
	});
	if (r) try {
		let n = Buffer.from(t, "base64");
		a.writeFileSync(r, n), e.reply("save-success", !0);
	} catch (t) {
		console.error("Failed to save image:", t), e.reply("save-success", !1);
	}
	else e.reply("save-success", !1);
}), r.handle("scan-image", async () => {
	let e = i.join(t.getPath("temp"), `scan_${Date.now()}.png`), n = i.join(t.getPath("temp"), `scan_${Date.now()}.ps1`), r = `
$tempFile = "${e.replace(/\\/g, "\\\\")}"
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
		a.writeFileSync(n, r, "utf8");
	} catch (e) {
		return { error: `Failed to create scanner scripts: ${e instanceof Error ? e.message : String(e)}` };
	}
	return new Promise((t) => {
		s(`powershell -NoProfile -ExecutionPolicy Bypass -File "${n}"`, (r, i) => {
			try {
				a.existsSync(n) && a.unlinkSync(n);
			} catch {}
			if (r) {
				let e = r instanceof Error ? r.message : String(r);
				console.error("PowerShell Process Error:", e), t({ error: e });
				return;
			}
			let o = i.trim();
			if (o.startsWith("SUCCESS")) try {
				if (a.existsSync(e)) {
					let n = a.readFileSync(e).toString("base64");
					a.unlinkSync(e), t(`data:image/png;base64,${n}`);
				} else t({ error: "Scanned file was not found on disk." });
			} catch (e) {
				t({ error: `Read error: ${e instanceof Error ? e.message : String(e)}` });
			}
			else o.startsWith("ERROR|") ? t({ error: o.substring(6) }) : t({ error: o || "No scanner device detected or scan timed out." });
		});
	});
});
//#endregion
export {};
