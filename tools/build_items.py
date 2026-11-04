# Genera docs/items.js a partir de las imágenes de Nano Banana (rutas de ejemplo: ajusta D y SRC).
# Uso: python3 tools/build_items.py  -> escribe items.json; luego se incrusta en docs/items.js
import numpy as np, json, sys
from PIL import Image
from collections import deque
D='/mnt/user-data/attachments/0e824639-96b1-54a4-95b3-706e6147f85b/'
SRC={'bed':'01332bb5-image.jpg','sofa':'746c8390-image.jpg','tv':'f297d472-image.jpg','teddy':'80f30fc3-image.jpg'}
def load(n):
    return np.array(Image.open(D+SRC[n]).convert('RGB')).astype(int)
def bgmask(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    return (r>170)&(b>170)&(g<110)&(abs(r-b)<80)
def flood_tan(a,bg):
    # tan floor/shadow pixels connected to the background count as background
    r,g,b=a[...,0],a[...,1],a[...,2]
    tan=(r>170)&(g>110)&(b>60)&(b<150)&(r-b>60)&(~bg)
    h,w=bg.shape; out=bg.copy(); q=deque()
    for y in range(h):
        for x in range(w):
            if out[y,x]: q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
            yy,xx=y+dy,x+dx
            if 0<=yy<h and 0<=xx<w and not out[yy,xx] and tan[yy,xx]:
                out[yy,xx]=True; q.append((yy,xx))
    return out
def prep(name, rect=None, tan=False):
    a=load(name)
    if rect: a=a[rect[1]:rect[3],rect[0]:rect[2]]
    bg=bgmask(a)
    if tan: bg=flood_tan(a,bg)
    return a,~bg
def to_sprite(a,fg,box,w,ncol=12):
    from PIL import ImageFilter
    x0,y0,x1,y1=box
    h=round(w*(y1-y0)/(x1-x0))
    m0=Image.fromarray((fg*255).astype('uint8')).filter(ImageFilter.MinFilter(5))   # quita el borde mezclado con magenta
    f2=(np.array(m0)>127)[y0:y1,x0:x1]
    arr=a[y0:y1,x0:x1].astype(float)*f2[...,None]
    num=Image.fromarray(arr.astype('uint8')) 
    # media solo de píxeles de primer plano, por canal
    chans=[np.array(Image.fromarray((arr[...,c]).astype('float32'),'F').resize((w,h),Image.BOX)) for c in range(3)]
    cov=np.array(Image.fromarray(f2.astype('float32'),'F').resize((w,h),Image.BOX))
    rgb=np.stack([np.where(cov>0.01,c/np.maximum(cov,0.01),0) for c in chans],-1).clip(0,255)
    return Image.fromarray(rgb.astype('uint8')), cov>0.45
def quant(imgs_masks,ncol=12):
    # shared palette across variants
    allpx=np.concatenate([np.array(i).reshape(-1,3)[m.reshape(-1)] for i,m in imgs_masks])
    pimg=Image.fromarray(allpx.reshape(-1,1,3).astype('uint8')).quantize(ncol,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    pal=np.array(pimg.getpalette()[:ncol*3]).reshape(-1,3)
    res=[]
    for i,m in imgs_masks:
        arr=np.array(i).astype(int); idx=((arr[:,:,None,:]-pal[None,None])**2).sum(-1).argmin(-1)
        idx=np.where(m,idx,-1); res.append(idx)
    return pal,res
def bbox(fg,pad=0):
    ys,xs=np.where(fg); return xs.min(),ys.min(),xs.max()+1,ys.max()+1
out={}
def build(name,variants,w_small,w_large):
    # variants: list of (a,fg); common bbox
    bbs=[bbox(f) for a,f in variants]
    box=(min(b[0] for b in bbs),min(b[1] for b in bbs),max(b[2] for b in bbs),max(b[3] for b in bbs))
    for tag,w in (('sm',w_small),('lg',w_large)):
        ims=[to_sprite(a,f,box,w) for a,f in variants]
        pal,res=quant(ims,12 if tag=='sm' else 16)
        chars='abcdefghijklmnop'
        out.setdefault(name,{})[tag]={'pal':['#%02x%02x%02x'%tuple(p) for p in pal],
            'rows':[[''.join('.' if v<0 else chars[v] for v in row) for row in idx] for idx in res]}
        Image.fromarray(np.array([[ (0,0,0,0) if v<0 else tuple(list(pal[v])+[255]) for v in row] for row in res[0]],dtype='uint8'),'RGBA').resize((res[0].shape[1]*8,res[0].shape[0]*8),Image.NEAREST).save(f'prev_{name}_{tag}.png')
a,f=prep('bed',tan=True); build('bed',[(a,f)],20,40)
a,f=prep('sofa'); build('sofa',[(a,f)],22,40)
t=load('tv'); H=t.shape[0]
# split in two halves at the black separator
def tvhalf(y0,y1):
    s=t[y0:y1]; bg=bgmask(s); fg=~bg
    # drop the black separator rows
    return s,fg
ta,tf=tvhalf(0,500); tb,tbf=tvhalf(512,1024)
# align: bottom half is offset by ~11px
tb=tb[:488]; tbf=tbf[:488]; ta=ta[:488]; tf=tf[:488]
build('tv',[(ta,tf),(tb,tbf)],13,36)
a,f=prep('teddy'); build('teddy',[(a,f)],10,28)
json.dump(out,open('items.json','w'))
for n in out: print(n,{k:(len(v['rows'][0]),len(v['rows'][0][0])) for k,v in out[n].items()})
