# Añade lámpara, planta, cuadro y alfombra a docs/items.js desde las imágenes de Nano Banana (rutas de ejemplo).
import numpy as np, json, re
from PIL import Image, ImageFilter, ImageEnhance
D='/mnt/user-data/attachments/0e824639-96b1-54a4-95b3-706e6147f85b/'
IMG={'lamps':'f5916f53-image.jpg','lampon':'ef40b7c6-image.jpg','pp':'56749140-image.jpg','rug':'13e17372-image.jpg'}
ld=lambda k: np.array(Image.open(D+IMG[k]).convert('RGB')).astype(int)
def fgmask(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    bg=(r>170)&(b>150)&(g<120)&(abs(r-b)<80)
    m=Image.fromarray(((~bg)*255).astype('uint8')).filter(ImageFilter.MinFilter(3)); return np.array(m)>127
def region(a,fg,box,w,h,boost=1.25):
    x0,y0,x1,y1=box; H,W=y1-y0,x1-x0
    img=Image.fromarray(a[y0:y1,x0:x1].astype('uint8'))
    img=ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(boost)).enhance(1.1)
    return np.array(img),fg[y0:y1,x0:x1],w,h
def build(name,parts,ncol,sizes,thr=0.15):
    out={}
    for tag,(w,h) in sizes.items():
        ps=[region(a,f,b,w,h) for a,f,b in parts]
        px=np.concatenate([arr[m].reshape(-1,3) for arr,m,_,_ in ps])
        pal=np.array(Image.fromarray(px.reshape(-1,1,3).astype('uint8')).quantize(ncol,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).getpalette()[:ncol*3]).reshape(-1,3)
        dark=pal.sum(1).argmin(); allrows=[]
        for arr,m,_,_ in ps:
            idx=((arr[:,:,None,:].astype(int)-pal[None,None])**2).sum(-1).argmin(-1)
            Hh,Ww=idx.shape; rows=[]
            for j in range(h):
                row=''
                for i in range(w):
                    ys,ye=int(j*Hh/h),max(int(j*Hh/h)+1,int((j+1)*Hh/h)); xs,xe=int(i*Ww/w),max(int(i*Ww/w)+1,int((i+1)*Ww/w))
                    mm=m[ys:ye,xs:xe]
                    if mm.mean()<0.5: row+='.'; continue
                    c=idx[ys:ye,xs:xe][mm]; cnt=np.bincount(c,minlength=len(pal))
                    row+=chr(97+(dark if cnt[dark]>=thr*c.size else cnt.argmax()))
                rows.append(row)
            allrows.append(rows)
        out[tag]={'pal':['#%02x%02x%02x'%tuple(p) for p in pal],'rows':allrows}
    return out
A=ld('lamps'); B=ld('lampon'); C=ld('pp'); R=ld('rug')
FA,FB,FC,FR=fgmask(A),fgmask(B),fgmask(C),fgmask(R)
new={
 'lamp':build('lamp',[(A,FA,(685,100,955,925)),(B,FB,(378,100,648,925))],14,{'hd':(14,44),'lg':(14,44)}),
 'plant':build('plant',[(C,FC,(50,150,495,925))],14,{'hd':(18,30),'lg':(32,56)},0.3),
 'picture':build('picture',[(C,FC,(540,180,965,500))],10,{'hd':(22,17),'lg':(44,34)}),
 'rug':build('rug',[(R,FR,(45,200,975,840))],10,{'hd':(40,20),'lg':(48,26)}),
}
s=open('../docs/items.js').read()
m=re.search(r'LIMA\.ITEMS = (\{.*\});\s*\}\)\(\);',s,re.S); items=json.loads(m.group(1)); items.update(new)
s=s[:m.start(1)]+json.dumps(items,separators=(',',':'))+s[m.end(1):]
open('../docs/items.js','w').write(s)
for n,v in new.items():
    for t,x in v.items():
        pal=[tuple(int(c[i:i+2],16) for i in (1,3,5)) for c in x['pal']]
        for k,rows in enumerate(x['rows']):
            Image.fromarray(np.array([[(0,0,0,0) if ch=='.' else pal[ord(ch)-97]+(255,) for ch in r] for r in rows],dtype='uint8'),'RGBA').resize((len(rows[0])*8,len(rows)*8),Image.NEAREST).save(f'/tmp/claude-0/items/n_{n}_{t}{k}.png')
