import math
def srgb_to_lin(c):
    c/=255; return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def hex_to_oklch(h):
    h=h.lstrip('#'); r,g,b=[srgb_to_lin(int(h[i:i+2],16)) for i in (0,2,4)]
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b
    m=0.2119034982*r+0.6806995451*g+0.1073969566*b
    s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s=[x**(1/3) for x in (l,m,s)]
    L=0.2104542553*l+0.7936177850*m-0.0040720468*s
    a=1.9779984951*l-2.4285922050*m+0.4505937099*s
    bb=0.0259040371*l+0.7827717662*m-0.8086757660*s
    C=math.hypot(a,bb); H=math.degrees(math.atan2(bb,a))%360
    return round(L,3),round(C,3),round(H)

def oklch_to_hex(L, C, H):
    a=C*math.cos(math.radians(H)); b=C*math.sin(math.radians(H))
    l_=L+0.3963377774*a+0.2158037573*b; m_=L-0.1055613458*a-0.0638541728*b; s_=L-0.0894841775*a-1.2914855480*b
    l,m,s=l_**3,m_**3,s_**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s
    g=-1.2684380046*l+2.6097574011*m-0.3413193965*s
    bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    def enc(x):
        if x<0 or x>1: return None
        return round(255*(12.92*x if x<=0.0031308 else 1.055*x**(1/2.4)-0.055))
    v=[enc(x) for x in (r,g,bb)]
    if None in v: return None
    return '#%02X%02X%02X'%tuple(v)

def fit(L,C,H):
    while C>0:
        h=oklch_to_hex(L,C,H)
        if h: return h
        C-=0.002
    return oklch_to_hex(L,0,H)

def contrast(h1,h2):
    def lum(h):
        h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
        c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
        return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
    a,b=lum(h1),lum(h2); return (max(a,b)+0.05)/(min(a,b)+0.05)
