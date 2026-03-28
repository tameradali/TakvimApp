namespace TakvimApp.Domain.Entities;

public class BeklenenEgitim
{
    public int      Id                { get; set; }
    public int      KullaniciId       { get; set; }
    public string   Baslik            { get; set; } = string.Empty;
    public DateTime BaslangicTarihi   { get; set; }
    public DateTime BitisTarihi       { get; set; }
    public decimal  GunlukFiyat       { get; set; }
    public string?  Notlar            { get; set; }
    public DateTime OlusturulmaTarihi { get; set; }
    public int?     KurumId          { get; set; }
    /// <summary>JOIN'den gelir — yazılmaz</summary>
    public string?  KurumAdi         { get; set; }
    /// <summary>Bu beklenen eğitim için tahmini gün sayısı</summary>
    public int      BeklenenGunSayisi { get; set; } = 1;
}
