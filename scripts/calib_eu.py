#!/usr/bin/env python3
"""Avrupa güneş ve rüzgâr fiyat oranı (capture rate) örnek hesabı — kalibrasyon raporu (docs/kalibrasyon.md) için.

Veri: ENTSO-E Şeffaflık Platformu, 2025, gün öncesi fiyat (A44) ve gerçekleşen üretim (A75), Almanya-Lüksemburg (DE_LU) ve
İspanya (ES) teklif bölgeleri; her ayın 15'i (12 gün). Günlük değerler (baz ortalama fiyat, günlük capture fiyatı, günlük üretim)
ENTSO-E verisinden capture_price hesabıyla alındı. Fiyatlar EUR/MWh.
Yıllık örnek capture = Σ(günlük capture × günlük üretim) / Σ üretim; oran = bu değer / günlerin baz ortalaması.
Kullanım: python3 scripts/calib_eu.py
"""
# ENTSO-E capture_price (EUR/MWh): gün -> (baz ortalama, capture fiyatı, üretim GWh)
DE_SOLAR={"01-15":(222.18,305.37,22.9),"02-15":(133.66,120.18,60.7),"03-15":(92.92,67.97,159.7),"04-15":(70.04,33.73,261.4),"05-15":(66.24,17.19,369.3),
 "06-15":(61.84,15.17,272.1),"07-15":(90.82,69.31,274.0),"08-15":(73.61,27.83,362.2),"09-15":(8.83,-5.04,226.1),"10-15":(145.72,131.03,104.1),"11-15":(90.7,87.64,50.9),"12-15":(87.4,86.72,64.9)}
DE_WIND={"01-15":(222.18,169.26,154.0)}
DE_WIND.update({"02-15":(133.66,133.36,31.4),"03-15":(92.92,94.31,288.0),"04-15":(70.04,68.75,413.2),"05-15":(66.24,62.07,333.6),"06-15":(61.84,76.2,194.4),"07-15":(90.82,83.95,204.2)})
DE_WIND.update({"08-15":(73.61,79.32,162.1),"09-15":(8.83,9.57,767.4),"10-15":(145.72,144.06,66.8),"11-15":(90.7,89.48,427.1),"12-15":(87.4,87.3,441.7)})
ES_SOLAR={"01-15":(140.68,128.85,117.9)}
ES_SOLAR.update({"02-15":(90.43,49.73,110.5),"03-15":(48.89,8.8,137.4),"04-15":(11.73,3.48,140.8),"05-15":(11.62,0.74,155.6),"06-15":(22.33,2.73,188.3),"07-15":(83.11,51.32,258.9)})
ES_SOLAR.update({"08-15":(69.27,25.96,219.9),"09-15":(66.88,22.54,223.2),"10-15":(109.4,81.46,149.2),"11-15":(31.46,27.53,37.9),"12-15":(92.47,91.38,49.1)})
ES_WIND={"01-15":(140.68,144.12,162.1)}
ES_WIND.update({"02-15":(90.43,87.43,112.4),"03-15":(48.89,49.75,139.6),"04-15":(11.73,12.61,225.0),"05-15":(11.62,13.87,124.2),"06-15":(22.33,31.09,151.9),"07-15":(83.11,94.2,105.4)})
ES_WIND.update({"08-15":(69.27,76.33,89.4),"09-15":(66.88,81.32,88.8),"10-15":(109.4,113.59,34.3),"11-15":(31.46,31.26,303.2),"12-15":(92.47,92.48,136.4)})
def agg(name,S):
    assert len(S)==12,name
    base=sum(v[0] for v in S.values())/12
    cap=sum(v[1]*v[2] for v in S.values())/sum(v[2] for v in S.values())
    print(f"{name}: örnek baz {base:.1f} EUR/MWh, capture {cap:.1f}, oran {cap/base:.3f}")
    return base,cap
for n,S in [("DE güneş",DE_SOLAR),("DE rüzgâr",DE_WIND),("ES güneş",ES_SOLAR),("ES rüzgâr",ES_WIND)]:agg(n,S)
# EUR/USD: EPİAŞ'ın aynı günler için yayımladığı priceUsd/priceEur oranlarının ortalaması (Türkiye örnek günleri)
r=[69.29/67.88,65.68/60.43,83.1/73.19,77.5/69.75,73.16/64.56,80.73/69.08,76.22/65.76]
print("EUR/USD (EPİAŞ örnek günleri)",round(sum(r)/len(r),3))
