// Original procedural instrumental: no third-party recordings or samples.
import fs from 'node:fs';
const rate=44100,seconds=72,n=rate*seconds,data=Buffer.alloc(44+n*4);
data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(2,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*4,28);data.writeUInt16LE(4,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(n*4,40);
const chords=[[49,56,61,64],[45,52,57,61],[52,59,64,68],[47,54,59,63]],hz=m=>440*2**((m-69)/12),beat=2/3;
for(let i=0;i<n;i++){
 const t=i/rate,bar=Math.floor(t/(beat*8)),chord=chords[bar%4],local=t%(beat*8),env=Math.min(1,local/.6,(beat*8-local)/.7),pulse=t%beat;
 let pad=chord.reduce((s,m)=>s+Math.sin(t*hz(m)*Math.PI*2)+.3*Math.sin(t*hz(m)*Math.PI*4),0)*.018*env;
 const pluckNote=chord[Math.floor(t/(beat/2))%4]+12,pluckTime=t%(beat/2);
 const pluck=Math.sin(t*hz(pluckNote)*Math.PI*2)*Math.exp(-pluckTime*17)*.032;
 const kick=Math.sin(2*Math.PI*(48*pulse+3*(1-Math.exp(-pulse*25))))*Math.exp(-pulse*18)*.055;
 const fade=Math.min(1,t/2,(seconds-t)/3);const sample=(pad+pluck+kick)*fade;
 data.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(sample*32767))),44+i*4);
 data.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round((sample+Math.sin(t*hz(chord[2])*Math.PI*2)*.005*env)*fade*32767))),46+i*4);
}
fs.writeFileSync(new URL('./public/soundtrack.wav',import.meta.url),data);
