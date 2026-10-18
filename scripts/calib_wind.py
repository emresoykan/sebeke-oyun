#!/usr/bin/env python3
"""Rüzgâr filosu kapasite faktörü (KF) hedefleri — rüzgâr kalibrasyonu (docs/kalibrasyon.md) için.

KF = üretim ÷ (kurulu güç × saat). Kaynaklar:
- Türkiye: TEİAŞ 2025 aylık rüzgâr üretimi (GWh) ve yıl sonu kurulu güç (MW, 2024 ve 2025); ay içi kurulu güç iki yıl sonu
  arasında doğrusal varsayıldı. İl dağılımı: EPDK üretim lisansları, işletmedeki RES'lerin mekanik kurulu gücü (MWm).
- Almanya: ENTSO-E Şeffaflık Platformu, gerçekleşen üretim (A75) aylık toplamı, kara ve deniz rüzgârı; Ocak–Ekim 2025
  (Ekim Energy-Charts yedeğinden), Aralık için Aralık 2024; Kasım sorgusu zaman aşımına uğradı, Ekim ile Aralık ortalaması
  alındı (tahmin). Kurulu güç: ENTSO-E A68, 2025 başı (yıl içi artış bilinmiyor, KF hafifçe yüksek çıkabilir).
- İspanya: ENTSO-E A75 aylık 2025 (Nisan %95,1 kapsama, ölçeklendi), kurulu güç ENTSO-E A68 2025 başı.
Kullanım: python3 scripts/calib_wind.py
"""
H=[744,672,744,720,744,720,744,744,720,744,720,744]
def show(name,twh,cap_mw):
    caps=cap_mw if isinstance(cap_mw,list) else [cap_mw]*12
    m=[twh[i]*1e6/(caps[i]*H[i]) for i in range(12)]
    y=sum(twh)*1e6/sum(caps[i]*H[i] for i in range(12))
    print(f"{name}: yıllık KF %{y*100:.1f} | aylık "+" ".join(f"{x*100:.1f}" for x in m))
    return y,m

# Türkiye, TEİAŞ (GWh → TWh)
TR=[2854.496155,3077.95152,3493.158497,2835.153587,2794.890919,3845.670428,3607.319194,4610.649402,3815.073952,2633.377245,3026.592134,3170.970819]
C0,C1=12870.7904,14792.102
show("Türkiye kara",[x/1000 for x in TR],[C0+(C1-C0)*(i+0.5)/12 for i in range(12)])
print(f"  yıl sonu kurulu güçle aralık: %{sum(TR)/(C1*8.76)*100:.1f} – %{sum(TR)/(C0*8.76)*100:.1f}")

# EPDK il dağılımı (işletmedeki MWm; 308 lisans, toplam ~15.963 MWm). Oyundaki filo ölçümünde ilk 25 il kullanıldı.
EPDK={"İZMİR":1887,"BALIKESİR":1740,"ÇANAKKALE":1487,"İSTANBUL":1004,"MANİSA":854,"KIRKLARELİ":678,"BURSA":650,"AYDIN":580,
 "HATAY":467,"KAYSERİ":417,"AFYONKARAHİSAR":403,"KONYA":358,"SİVAS":329,"MUĞLA":315,"YALOVA":308,"MERSİN":266,"SAKARYA":258,
 "OSMANİYE":256,"EDİRNE":243,"BİLECİK":241,"KARAMAN":241,"TEKİRDAĞ":232,"KIRŞEHİR":174,"TOKAT":166,"UŞAK":165}
print(f"  EPDK ilk 25 il: {sum(EPDK.values())} MWm (toplamın ~%86'sı)")

# Almanya, ENTSO-E (TWh)
DE=[13.253343,7.260680,6.526921,5.876507,7.894317,8.705266,6.191449,5.483354,9.763607,13.640429,None,13.757536]
DE[10]=(DE[9]+DE[11])/2
show("Almanya kara",DE,63403.17)
DEO=[2.539811,2.260149,1.889088,1.080765,1.861448,1.848897,1.561248,1.699078,2.410541,2.887705,None,2.466862]
DEO[10]=(DEO[9]+DEO[11])/2
show("Almanya deniz",DEO,9215)

# İspanya, ENTSO-E (TWh)
ES=[7.422503,3.619226,6.552623,4.062867/0.951,3.250375,2.989948,4.258560,3.472552,3.755766,4.252106,6.740850,5.077746]
show("İspanya kara",ES,30931.9)
