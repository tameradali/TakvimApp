using TakvimApp.Domain.Entities;

namespace TakvimApp.Api.Services;

public class GelirHesaplamaServisi
{
    public record EtkinlikGelirKalemi(
        int     EtkinlikId,
        string  Baslik,
        int     TamamlananGunSayisi,
        decimal GunlukFiyat,
        decimal Masraf,
        decimal ToplamGelir);

    public record BeklenenGelirKalemi(
        int     EgitimId,
        string  Baslik,
        int     ToplamGunSayisi,
        decimal GunlukFiyat,
        decimal ToplamGelir);

    public record AylikGelirSonucu(
        int Ay,
        int Yil,
        decimal ToplamGelir,
        List<EtkinlikGelirKalemi>  EtkinlikDetaylari,
        List<BeklenenGelirKalemi>  BeklenenDetaylari);

    public AylikGelirSonucu HesaplaAylik(
        int ay, int yil,
        List<EgitimEtkinligi>  etkinlikler,
        List<BeklenenEgitim>   beklenenler)
    {
        var bugun         = DateTime.UtcNow.Date;
        var ayBaslangici  = new DateTime(yil, ay, 1);
        var ayBitisi      = ayBaslangici.AddMonths(1).AddDays(-1);

        var etkinlikKalemleri = new List<EtkinlikGelirKalemi>();
        foreach (var e in etkinlikler)
        {
            if (e.GunlukFiyat is null || e.GunlukFiyat <= 0) continue;

            // iCal DTEND exclusive olduğu için BitisTarihi = son günün ertesi günü.
            // effectiveEnd hesaplamasında +1 eklenmez; bugün dahil etmek için cap = bugun+1.
            var effectiveStart = e.BaslangicTarihi.Date > ayBaslangici ? e.BaslangicTarihi.Date : ayBaslangici;
            var effectiveEnd   = e.BitisTarihi.Date < ayBitisi.AddDays(1) ? e.BitisTarihi.Date : ayBitisi.AddDays(1);
            effectiveEnd       = effectiveEnd <= bugun ? effectiveEnd : bugun.AddDays(1);

            if (effectiveEnd <= effectiveStart) continue;

            var gunSayisi  = (effectiveEnd - effectiveStart).Days;
            var masraf     = e.Masraf ?? 0m;
            var toplam     = gunSayisi * e.GunlukFiyat.Value + masraf;

            etkinlikKalemleri.Add(new EtkinlikGelirKalemi(
                e.Id, e.Baslik, gunSayisi, e.GunlukFiyat.Value, masraf, toplam));
        }

        var beklenenKalemleri = new List<BeklenenGelirKalemi>();
        foreach (var b in beklenenler)
        {
            var effectiveStart = b.BaslangicTarihi.Date > ayBaslangici ? b.BaslangicTarihi.Date : ayBaslangici;
            var effectiveEnd   = b.BitisTarihi.Date < ayBitisi ? b.BitisTarihi.Date : ayBitisi;

            if (effectiveEnd < effectiveStart) continue;

            var gunSayisi = (effectiveEnd - effectiveStart).Days + 1;
            var toplam    = gunSayisi * b.GunlukFiyat;

            beklenenKalemleri.Add(new BeklenenGelirKalemi(
                b.Id, b.Baslik, gunSayisi, b.GunlukFiyat, toplam));
        }

        var toplamGelir = etkinlikKalemleri.Sum(k => k.ToplamGelir)
                        + beklenenKalemleri.Sum(k => k.ToplamGelir);

        return new AylikGelirSonucu(ay, yil, toplamGelir, etkinlikKalemleri, beklenenKalemleri);
    }
}
