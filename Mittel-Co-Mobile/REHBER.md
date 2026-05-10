# Mittel Co. Mobil Uygulama Rehberi

Bu klasör, Mittel Co. web projesinin **iOS (App Store)** ve **Android (Play Store)** platformları için hazır hale getirilmiş mobil uygulama versiyonunu içermektedir.

## Kullanılan Teknoloji
Bu proje **Capacitor** kullanılarak native bir sarmalayıcı (wrapper) içine alınmıştır. Bu sayede web projenizdeki tüm özellikler (Video kaydırma, Parallax, Admin Paneli) mobil cihazlarda bir uygulama olarak çalışabilir.

## Gereksinimler
- **macOS** (iOS derlemesi için gereklidir)
- **Xcode** (App Store için)
- **Android Studio** (Play Store için)
- **Node.js** (Yüklü olmalıdır)

## Uygulamayı Geliştirme Ortamında Açmak

### 1. Android (Play Store)
Android projesini Android Studio ile açmak için terminalde şu komutu çalıştırın:
```bash
npx cap open android
```
Veya Android Studio'yu açıp bu klasörün içindeki `android` klasörünü seçin.

### 2. iOS (App Store)
iOS projesini Xcode ile açmak için terminalde şu komutu çalıştırın:
```bash
npx cap open ios
```
Veya Xcode'u açıp bu klasörün içindeki `ios/App/App.xcworkspace` dosyasını seçin.

## Güncelleme Yapıldığında
Eğer ana web projesinde (index.html, main.js vb.) bir değişiklik yaparsanız, bu değişiklikleri mobil uygulamaya aktarmak için şu adımları izleyin:

1. Web projesini derleyin:
   ```bash
   npm run build
   ```
2. Değişiklikleri mobil platformlara kopyalayın:
   ```bash
   npx cap copy
   ```

## İkon ve Açılış Ekranı (Splash Screen)
İkonları değiştirmek için `assets` klasörü oluşturulup `capacitor-assets` aracı kullanılabilir. Şu an varsayılan Capacitor ikonları yüklüdür.

## Yayınlama (Release)
- **Android:** Android Studio içinde `Build > Generate Signed Bundle / APK` adımlarını izleyin.
- **iOS:** Xcode içinde hedef cihazı "Any iOS Device (arm64)" seçip `Product > Archive` adımlarını izleyin.

---
**Mittel Co.** - Profesyonel Mobil Çözüm
