

let blePrinter=null,bleCharacteristic=null;
async function connectBlePrinter(){
 if(!navigator.bluetooth){alert("Web Bluetooth tidak didukung browser ini.");return;}
 try{
  document.getElementById("bleStatus").textContent="Status: Memilih printer...";
  blePrinter=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:["000018f0-0000-1000-8000-00805f9b34fb","6e400001-b5a3-f393-e0a9-e50e24dcca9e"]});
  const s=await blePrinter.gatt.connect();
  let svc=null;
  for(const u of ["000018f0-0000-1000-8000-00805f9b34fb","6e400001-b5a3-f393-e0a9-e50e24dcca9e"]){try{svc=await s.getPrimaryService(u);break}catch(e){}}
  if(!svc) throw Error("Service GATT printer tidak ditemukan.");
  const cs=await svc.getCharacteristics();
  bleCharacteristic=cs.find(c=>c.properties.writeWithoutResponse||c.properties.write);
  if(!bleCharacteristic) throw Error("Karakteristik write tidak ditemukan.");
  document.getElementById("bleStatus").textContent="Status: Terhubung - "+(blePrinter.name||"Printer BLE");
 }catch(e){bleCharacteristic=null;document.getElementById("bleStatus").textContent="Status: Gagal - "+e.message;}
}
function disconnectBlePrinter(){try{if(blePrinter?.gatt?.connected)blePrinter.gatt.disconnect()}catch(e){}bleCharacteristic=null;const e=document.getElementById("bleStatus");if(e)e.textContent="Status: Terputus";}
async function bleWrite(b){if(!bleCharacteristic)throw Error("Printer BLE belum terhubung.");for(let i=0;i<b.length;i+=180){let c=b.slice(i,i+180);if(bleCharacteristic.writeValueWithoutResponse)await bleCharacteristic.writeValueWithoutResponse(c);else await bleCharacteristic.writeValue(c)}}
async function testBlePrinter(){try{const b=new Uint8Array([27,64,27,97,1,...new TextEncoder().encode("SEBLAK STORY\nTES PRINTER BLE 80mm\nBerhasil terhubung\n\n\n"),27,97,0]);await bleWrite(b);document.getElementById("bleStatus").textContent="Status: Tes cetak terkirim"}catch(e){alert(e.message)}}
window.printEscPosOverBle=bleWrite;
