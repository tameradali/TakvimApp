namespace TakvimApp.Domain.Entities;

public class BeklenenEgitim
{
    public int      Id              { get; set; }
    public int      KullaniciId     { get; set; }
    public string   Baslik          { get; set; } = string.Empty;
    public DateTime BaslangicTarihi { get; set; }
    public DateTime BitisTarihi     { get; set; }
    public decimal  GunlukFiyat     { get; set; }
    public string?  Notlar          { get; set; }
    public DateTime OlusturulmaTarihi { get; set; }
}
