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
        decimal ToplamGelir,
        int?    KurumId,
        string? KurumAdi);

    public record PlanlananGelirKalemi(
        int     EtkinlikId,
        string  Baslik,
        int     PlanlananGunSayisi,
        decimal GunlukFiyat,
        decimal ToplamGelir,
        int?    KurumId,
        string? KurumAdi);

    public record BeklenenGelirKalemi(
        int     EgitimId,
        string  Baslik,
        int     ToplamGunSayisi,
        decimal GunlukFiyat,
        decimal ToplamGelir,
        int?    KurumId,
        string? KurumAdi);

    public record AylikGelirSonucu(
        int Ay,
        int Yil,
        decimal ToplamGelir,
        List<EtkinlikGelirKalemi>  EtkinlikDetaylari,
        List<BeklenenGelirKalemi>  BeklenenDetaylari,
        List<PlanlananGelirKalemi> PlanlananDetaylari);

    public AylikGelirSonucu HesaplaAylik(
        int ay, int yil,
        List<EgitimEtkinligi>  etkinlikler,
        List<BeklenenEgitim>   beklenenler)
    {
        var bugun         = DateTime.UtcNow.Date;
        var yarin         = bugun.AddDays(1);
        var ayBaslangici  = new DateTime(yil, ay, 1);
        var ayBitisi      = ayBaslangici.AddMonths(1).AddDays(-1);

        var etkinlikKalemleri  = new List<EtkinlikGelirKalemi>();
        var planlananKalemleri = new List<PlanlananGelirKalemi>();

        foreach (var e in etkinlikler)
        {
            if (e.GunlukFiyat is null || e.GunlukFiyat <= 0) continue;
            if (e.EtkinlikTuru == "Toplanti") continue;

            // Gerçekleşen (tamamlanan) günler
            var effStart = e.BaslangicTarihi.Date > ayBaslangici ? e.BaslangicTarihi.Date : ayBaslangici;
            var effEnd   = e.BitisTarihi.Date < ayBitisi.AddDays(1) ? e.BitisTarihi.Date : ayBitisi.AddDays(1);
            effEnd       = effEnd <= bugun ? effEnd : bugun.AddDays(1);

            if (effEnd > effStart)
            {
                var gunSayisi = (effEnd - effStart).Days;
                var masraf    = (e.Masraf ?? 0m) * gunSayisi;
                var toplam    = gunSayisi * e.GunlukFiyat.Value + masraf;
                etkinlikKalemleri.Add(new EtkinlikGelirKalemi(
                    e.Id, e.Baslik, gunSayisi, e.GunlukFiyat.Value, masraf, toplam,
                    e.KurumId, e.KurumAdi));
            }

            // Planlanan (gelecek) günler
            var plStart = e.BaslangicTarihi.Date > ayBaslangici ? e.BaslangicTarihi.Date : ayBaslangici;
            if (plStart < yarin) plStart = yarin;
            var plEnd = e.BitisTarihi.Date < ayBitisi.AddDays(1) ? e.BitisTarihi.Date : ayBitisi.AddDays(1);

            if (plEnd > plStart)
            {
                var plGun    = (plEnd - plStart).Days;
                var plToplam = plGun * e.GunlukFiyat.Value;
                planlananKalemleri.Add(new PlanlananGelirKalemi(
                    e.Id, e.Baslik, plGun, e.GunlukFiyat.Value, plToplam,
                    e.KurumId, e.KurumAdi));
            }
        }

        // Beklenen: BeklenenGunSayisi alanını doğrudan kullan (tarih aralığı hesaplaması değil)
        var beklenenKalemleri = new List<BeklenenGelirKalemi>();
        foreach (var b in beklenenler)
        {
            var gunSayisi = b.BeklenenGunSayisi;
            if (gunSayisi <= 0) continue;
            var toplam = gunSayisi * b.GunlukFiyat;
            beklenenKalemleri.Add(new BeklenenGelirKalemi(
                b.Id, b.Baslik, gunSayisi, b.GunlukFiyat, toplam,
                b.KurumId, b.KurumAdi));
        }

        var toplamGelir = etkinlikKalemleri.Sum(k => k.ToplamGelir)
                        + beklenenKalemleri.Sum(k => k.ToplamGelir);

        return new AylikGelirSonucu(ay, yil, toplamGelir, etkinlikKalemleri, beklenenKalemleri, planlananKalemleri);
    }
}
