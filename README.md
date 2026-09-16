# Seblak Story POS Web v3.36.17

Versi web GitHub Pages Seblak Story POS.

## Backup JSON

Pada menu Backup, gunakan **📁 Pilih Folder Backup** sekali untuk memilih folder utama di perangkat/komputer. Aplikasi akan membuat folder **backup** di dalam folder tersebut. Setelah izin diberikan, tombol **💾 Backup JSON** menyimpan file JSON langsung ke folder `backup`.

Jika browser tidak mendukung File System Access API atau izin folder belum diberikan, aplikasi menggunakan download biasa sebagai fallback.

Data aplikasi tetap disimpan di localStorage browser.


BLE printer support added. Requires a BLE printer with a GATT writable characteristic; Bluetooth Classic/SPP printers are not supported by Web Bluetooth.
