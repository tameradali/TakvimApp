FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore için sadece csproj'ları kopyala (cache optimizasyonu)
COPY src/TakvimApp.Domain/TakvimApp.Domain.csproj src/TakvimApp.Domain/
COPY src/TakvimApp.Data/TakvimApp.Data.csproj     src/TakvimApp.Data/
COPY src/TakvimApp.Api/TakvimApp.Api.csproj       src/TakvimApp.Api/
COPY TakvimApp.sln .
RUN dotnet restore src/TakvimApp.Api/TakvimApp.Api.csproj

COPY src/ src/
RUN dotnet publish src/TakvimApp.Api/TakvimApp.Api.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "TakvimApp.Api.dll"]
