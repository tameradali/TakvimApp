namespace TakvimApp.Domain.Entities;

public class Kurum
{
    public int     Id          { get; set; }
    public int     KullaniciId { get; set; }
    public string  Ad          { get; set; } = string.Empty;
    public string? Notlar      { get; set; }
    /// <summary>Hex renk kodu, örn: #4caf50</summary>
    public string? Renk        { get; set; }
    /// <summary>Base64 veya URL olarak logo</summary>
    public string? Logo        { get; set; }
}
