# دليل النشر والتشغيل

خطوات تشغيل التطبيق على حساب Google الخاص بك. **لم تُجرَّب هذه الخطوات على حساب حقيقي** لأن Claude لا يصل إلى حسابك، لكنها تطابق طريقة نشر تطبيق مناشط الدعاة الذي بُني هذا التطبيق عليه.

## ما تحتاجه

- حساب Google يكون **مالك البيانات**. فيه يُنشأ جدول البيانات ومجلد الملفات الخاصة، ومنه يُقرأ جدول ردود النموذج.
- Node.js بالإصدار 22، وأداة `clasp`، وتثبّتها بالأمر: `npm i -g @google/clasp`.
- مكان استضافة ثابت يعمل بـ HTTPS للواجهة، مثل المكان الذي تستضيف فيه تطبيق الدعاة، أو GitHub Pages، أو Vercel، أو Netlify.

## 1. الخادم (Apps Script)

1. فعّل «Google Apps Script API» من الصفحة https://script.google.com/home/usersettings.
2. نفّذ الأوامر التالية في مجلد المستودع:
   ```
   clasp login
   clasp create --type standalone --title "Nuevo Musulmán" --rootDir server
   clasp push
   ```
   يُنشئ هذا ملف `.clasp.json`، وهو مستثنى من Git فلن يُرفع إلى المستودع.
3. افتح المشروع في محرر Apps Script بالأمر `clasp open`، ثم شغّل الدالة `setup` من زر ▶. ستطلب منك Google الموافقة على الصلاحيات، ثم:
   - يُنشأ جدول باسم «Nuevo Musulmán - datos».
   - يُنشأ مجلد باسم «Nuevo Musulmán - archivos privados».
   - يُسجَّل حسابك مشرفًا.
   - تُملأ قوائم الجنسيات ومراحل التعلّم الأولى.
4. **معرّف تسجيل الدخول:** من Google Cloud Console، أنشئ OAuth Client ID من نوع «Web application»:
   - في «Authorized JavaScript origins» أضف عنوان الواجهة، مثل `https://tu-dominio.example`.
   - أضف أيضًا `http://localhost:5173` إن أردت التجربة المحلية.
5. في محرر Apps Script: افتح Project Settings، ثم Script properties، وأضف الخاصية `CLIENT_ID` بقيمة المعرّف الذي أنشأته.
6. انشر الخادم: Deploy ثم New deployment، واختر النوع Web app، مع:
   - **Execute as:** حسابك أنت (Me).
   - **Who has access:** Anyone. هذا آمن: كل طلب يُتحقق منه برمز Google، والروابط العامة برمزها الخاص.

   انسخ العنوان الذي ينتهي بـ `/exec`.

## 2. الواجهة

1. انسخ `.env.example` إلى ملف باسم `.env.local`، واملأه:
   ```
   VITE_API_URL=https://script.google.com/macros/s/…/exec
   VITE_GOOGLE_CLIENT_ID=….apps.googleusercontent.com
   ```
2. نفّذ `npm ci && npm run build`، ثم ارفع محتوى المجلد `dist/` إلى مكان الاستضافة.
3. افتح التطبيق وادخل بحسابك. ستدخل مشرفًا.

## 3. الإعداد الأول داخل التطبيق

1. **Ajustes ← General:**
   - اكتب «Dirección de la aplicación»، وهي عنوان الواجهة `https://…`. بدونها لا تعمل الروابط الشخصية.
   - اكتب اسم المركز الذي يظهر في التطبيق، والجهة المُصدِرة العامة للشهادة، ومكان الإصدار.
2. **Ajustes ← Sheij / maestros:**
   - أضف المشايخ. من له بريد Google يستطيع الدخول.
   - في «Otras formas de escribir el nombre» اكتب كل الصيغ التي كُتب بها اسم الشيخ في النموذج القديم، مفصولة بفواصل.
3. **Ajustes ← Cuentas:** أضف المتعاونين، والمشرفين الآخرين إن وُجدوا.
4. **Ajustes ← Campos del registro:**
   - حدّد الحقول الإلزامية، والحقول التي تظهر في الرابط الشخصي.
   - أضف حقولك الخاصة.
5. **Ajustes ← Nacionalidades / Etapas:** عدّل القوائم بحسب حاجتك.

## 4. إدخال السجلات القديمة من نموذج Google

1. تأكد أن حساب مالك التطبيق يستطيع فتح جدول ردود النموذج.
2. **Ajustes ← Formulario de Google:**
   - الصق رابط جدول الردود.
   - اضغط «Vista previa»، فهي لا تحفظ شيئًا.
   - إن كانت النتيجة سليمة فاضغط «Importar respuestas nuevas».
3. **راجع السجلات الموسومة «A revisar»:**
   - تصل إليها من الصفحة الرئيسية أو من مرشّح «Solo a revisar».
   - إن كان سبب الوسم أن اسم الشيخ غير معروف: أضف صيغة الاسم إلى الشيخ في قائمة المشايخ، ثم اضغط «Volver a reconocer sheij».
4. **الردود الجديدة:** كرّر الاستيراد متى شئت. كل رد يُستورد مرة واحدة فقط.

## 5. إعدادات الخصوصية في نموذج Google

- أوقف خيار «Ver resumen de resultados» (عرض ملخص النتائج)، حتى لا يرى من يملأ النموذج ردود غيره.
- لا تشارك جدول الردود مع أحد.

## 6. التحديثات اللاحقة

- **الخادم:** نفّذ `clasp push`، ثم Deploy ← Manage deployments ← ✏️ ← Version: New version. بهذه الطريقة يبقى العنوان كما هو.
- **الواجهة:** نفّذ `npm run build` من جديد، وارفع المجلد `dist/`.
