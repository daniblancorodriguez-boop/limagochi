import numpy as np, json
from PIL import Image, ImageFilter, ImageEnhance
exec(open('proc.py').read().split("def to_sprite")[0])   # loaders, bg masks, helpers
def clean_mask(fg):
    m0=Image.fromarray((fg*255).astype('uint8')).filter(ImageFilter.MinFilter(5)); return np.array(m0)>127
def sprite_mode(a,fg,box,w,ncol,boost=1.25):
    x0,y0,x1,y1=box; h=round(w*(y1-y0)/(x1-x0))
    f2=clean_mask(fg)[y0:y1,x0:x1]
    img=Image.fromarray(a[y0:y1,x0:x1].astype('uint8'))
    img=ImageEnhance.Color(img).enhance(boost); img=ImageEnhance.Contrast(img).enhance(1.1)
    arr=np.array(img)
    # paleta global del objeto (solo primer plano)
    px=arr[f2].reshape(-1,1,3)
    pal=np.array(Image.fromarray(px.astype('uint8')).quantize(ncol,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).getpalette()[:ncol*3]).reshape(-1,3)
    idx=((arr[:,:,None,:].astype(int)-pal[None,None])**2).sum(-1).argmin(-1)
    dark=pal.sum(1).argmin()
    H,W=idx.shape; out=-np.ones((h,w),int)
    for j in range(h):
        for i in range(w):
            ys,ye=int(j*H/h),int((j+1)*H/h); xs,xe=int(i*W/w),int((i+1)*W/w)
            m=f2[ys:ye,xs:xe]
            if m.mean()<0.5: continue
            c=idx[ys:ye,xs:xe][m]; cnt=np.bincount(c,minlength=len(pal))
            # el borde oscuro manda si ocupa >=30% de la celda: mantiene el contorno nítido
            out[j,i]= dark if cnt[dark]>=0.30*c.size else cnt.argmax()
    return pal,out
def png(pal,idx,path,z=8):
    Image.fromarray(np.array([[(0,0,0,0) if v<0 else tuple(list(pal[v])+[255]) for v in row] for row in idx],dtype='uint8'),'RGBA').resize((idx.shape[1]*z,idx.shape[0]*z),Image.NEAREST).save(path)
