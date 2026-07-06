# Members Hub → Community Forum — специфікація

**Файл:** `members.html` (self-contained прототип, без бекенду)
**Статус:** ТЗ узгоджено, верстка ще не почата
**Дата:** 2026-07-06

---

## 1. Ціль

Members Hub перетворюється з фото-галереї на **комʼюніті-форум**. Головна ідея клієнта:

> One of our goals is that potential customers could read it like a forum as well to learn things and get insights.

Тобто сторінка має працювати не лише як вітрина фото садів, а і як місце, де люди **читають, вчаться і діляться** — і фото-постами, і текстовими обговореннями.

---

## 2. Коментарі клієнта (Brett), які закриваємо

| # | Селектор / місце | Коментар | Що робимо |
|---|---|---|---|
| **#103** | Featured grower band | "We should mention clearly that you need to be a logged in user to make a post or create an account" | Помітний і послідовний гейтинг входу: банер над стрічкою + гейт на reply + gate-popup |
| **#102** | Members Hub section | "Can you make it so the user can click and open the post and see multiple images?" | Popup з **каруселлю кількох фото** + повним текстом |
| **#104** | Gallery header | "There will likely be text only posts where they want to reply with threads. Kind of like reddit" | Новий тип поста **без фото** + **коментарі/відповіді** |

**Уточнення від Toma:**
- Раз у нас уже є popup, що відкриває фото — розширюємо його, а не будуємо з нуля.
- Оскільки будуть і фото, і текст — це радше **article/blog**, тому пост = фото + текстова історія абзацами.
- Текстовий пост у стрічці = **тизер-заголовок 3–4 рядки** великим (H3–H4) стилем; по кліку відкривається **той самий popup, майже на весь екран**, з повним текстом, розбитим на абзаци.

---

## 3. Зафіксовані рішення

1. **Структура сторінки:** єдина стрічка-форум — фото-пости й текстові пости в одному потоці. Featured Grower лишається спотлайтом зверху.
2. **Перегляд поста:** розширюємо наявний popup/lightbox (не окрема сторінка).
3. **Відповіді:** прості коментарі — один рівень відповіді, **без голосування** (не повний reddit).
4. **Текстовий пост:** у стрічці — тизер-заголовок 3–4 рядки; у popup — near-fullscreen reading-режим.

---

## 4. Обсяг і межі

- Зачіпаємо **тільки `members.html`**. Інші сторінки та advisor-widget не чіпаємо.
- Усе — **мок без бекенду** (логін, публікація, відповіді — клієнтський JS), як і решта прототипу.
- **Нові asset-и не потрібні** — переюзаємо наявні `assets/pexels-*.jpg` (по кілька на пост для мульти-фото).
- Копі (заголовки, тексти постів, коментарі) — англійською, у дусі сайту (плейсхолдери).

---

## 5. Модель даних (JS-мок)

Один обʼєкт `MH_POSTS`, ключ = id картки. Картки у стрічці лишаються в DOM; `openPost(id)` бере дані звідси.

```js
{
  type: 'photo' | 'discussion',
  topic: 'Planting' | 'Pruning' | 'Pests' | 'Harvest' | 'Show your garden' | ...,
  title:  String,          // заголовок поста
  author: String,
  date:   String,          // 'July 2026'
  readTime: String,        // '4 min read' (для reading-режиму)
  meta:   String,          // 'Honeycrisp Apple · Zone 4 · Autumn' (для photo)
  images: [ 'assets/pexels-XXXX.jpg', ... ],  // 1–4; для discussion — []
  body:   [ 'абзац 1', 'абзац 2', ... ],      // текст статті
  product: { name, href } | null,              // опційний CTA на товар
  comments: [
    { author, date, text, replies: [ { author, date, text } ] }  // 1 рівень
  ]
}
```

---

## 6. Стрічка (feed)

- **Featured Grower** зверху — без змін (лишається спотлайтом).
- Галерея → **єдина стрічка** у наявному masonry-потоці:
  - **Фото-картка** — як зараз (фото-рамка + імʼя + мета), але веде в новий `openPost`.
  - **Discussion-картка** — без фото-рамки:
    - тизер-заголовок `--display`, ~**22–26px**, line-height ~1.2, обрізка **3–4 рядки** (`-webkit-line-clamp`);
    - під ним `--sans` дрібним: `автор · дата · тема · N replies`;
    - візуально відрізняється від фото-карток (напр. фон `--paper1`, іконка обговорення).
- **Фільтр типу** поряд з наявними: `All · Photos · Discussions` (+ лишаємо variety/season/zone).
- Заголовок секції під форум (напр. «From the community»), лічильник лишаємо.

---

## 7. Popup поста — ОДИН шаблон (оновлено на вимогу клієнта)

**Рішення:** усі popup однакові. Є **лише дві опції — з фото або без**; текстова частина виглядає **ідентично** в обох, а тексту інколи може й не бути. Один макет-заготовка, що завжди вміщає: (опційно) фото-карусель + текст + коментарі. Реалізовано однією функцією `mhRenderPost(id, post)` — режимів `photo`/`reading` більше немає.

Спільне: `role="dialog"`, `aria-modal="true"`, ESC + scrim + ✕ закривають, скрол лише всередині (фон заблоковано). Розмір: near-fullscreen `min(1080px,96vw) × 92vh`; на мобайлі — на весь екран.

**Структура (згори вниз, завжди однакова):**
1. **Sticky-топбар** — стислий заголовок + ✕.
2. **Reading-progress** — тонкий індикатор під топбаром.
3. **Скрол-область:**
   - a. **(опційно) фото-hero** — карусель на всю ширину popup (стрілки ‹ ›, крапки, лічильник `1/N`, свайп). Рендериться **лише якщо** у поста є `images`.
   - b. **Стаття** (центрована `max-width:68ch`): eyebrow/тема → **H1** → byline (`автор · дата · [мета] · [N min read]`) → **(опційно) тіло** (абзаци, H3-підзаголовки, `•`/`✓` списки, pull-quote, image-breather) → (опційно) CTA на товар.
   - c. **Коментарі** (центровані 68ch) + reply-гейт.
   - d. **Related** «More from the community».

Різниця між постами **тільки** в наявності hero-каруселі (a) і/або тіла тексту (b). Фото-пост і текстовий пост = той самий шаблон: ті самі відступи, той самий 68ch, та сама типографіка (H1 38px, body 19px/1.7).

### 7.1 Композер (створення поста) — узгоджений із viewer'ом

Стара вбудована форма («Add a photo» з dropzone + усіма полями) задовга, тож розбита на **прогресивне розкриття**:

- **Вбудований швидкий композер** (`.sg-card--quick`, у share-band) — компактний: заголовок, текстове поле (питання/апдейт), `Add photos`, sign-in note, і **дві кнопки**:
  - **Quick Add** (основна) — швидка публікація (за гейтом входу; порожнє поле → фокус, не гейт).
  - **Add more** (вторинна) — відкриває повний compose-popup.
- **Compose-popup** (`openCompose`/`mhRenderCompose`) — **дзеркалить viewer**: той самий shell (near-fullscreen, `is-compose`) і колонка **68ch**, поля розкладені як опублікований пост: фото-зона (dropzone на місці hero) → Topic (eyebrow) → **Title-інпут** (на місці H1) → сітка meta (variety/zone/season/location) → **body-textarea** → sign-in note → **Publish** (за гейтом). Введений у вбудованому полі текст **переноситься** в body попапа.
- Публікація/Quick Add для гостя → наявний `membersOpenGate()` (#103). Мок-прапорець `MH_SIGNED_IN`.

---

## 8. Best practices для reading-режиму (числа під верстку)

Джерела — див. §12. Значення підігнані під наші токени.

| Параметр | Значення | Нотатка |
|---|---|---|
| **Ширина колонки тексту** | `max-width: 62–68ch` (≈680px), центрована | Ідеал 50–75 симв./рядок (~66). Навіть у fullscreen текст НЕ на всю ширину — поля з боків це норма |
| **Розмір body** | ~**19px** (`--sans`), мін. 16 | Для лонгріду 18–20px |
| **Line-height body** | ~**1.7** | 1.5 база; довгі рядки → 1.6–1.7 |
| **Відступ між абзацами** | ~**2× шрифту** (34–38px) | Без абзацних табуляцій — тільки вертикальний відступ |
| **Вирівнювання** | **зліва** | Не justify (шкодить читабельності й a11y) |
| **Заголовок H1** | `--display` 32–40px | |
| **Підзаголовки** | H2/H3 як «паузи» | Ритм: щільний текст ↔ повітря |
| **Мобайл** | 1 колонка, padding ~20–22px, body 17–18px, повний скрол | |
| **Контраст** | `--ink`/`--ink2` на `#fff` | Проходить AA |

---

## 9. Коментарі / відповіді (прості)

- Список коментарів під постом: `автор · дата · текст`.
- Під кожним коментарем — **до одного рівня** відповіді (вкладена гілка).
- **Без голосування / upvote.**
- Внизу — поле «Add a reply».
- Мок: додавання коментаря/відповіді — клієнтський JS (або взагалі статичні приклади + гейт на введення).

---

## 10. Гейтинг входу + auth-флоу (#103)

- **Join-банер зверху** (див. §6) — головний CTA (Create an account / Sign in).
- **Gate-модалка** (`members-gate`): заголовок «Log in to continue», **головна кнопка Log in** (green `--g700`) + **дрібний link «Sign up»** (той самий зелений — однакового кольору). Тригериться діями гостя (Quick Add, Publish, Reply).
- **Log in** = мок-вхід (`membersGateLogin`): `MH_SIGNED_IN=true`, закриває гейт/будь-який `.lb`, оновлює UI, показує toast.
- **Join-банер зверху** — плоский бежевий фон `--paper2` (як announcement-bar над nav, **без градієнта**); кнопки **Log in** (`membersGateLogin`) + **Sign up** (`openSignup`).
- **Sign up** (`openSignup`) → **повний** реєстраційний флоу в `.lb` (`is-signup`), який дублює checkout-поля, щоб один акаунт покривав і спільноту, і касу:
  - зверху **соц-логіни** — Continue with **Google / Apple / Facebook** (`membersSocialAuth`, ті самі провайдери, що й у Cart & Checkout — див. `docs/cart-checkout-spec.md` §3), divider «or sign up with email»;
  - **Your details:** First/Last name, Email, **Phone**, Password, Hardiness zone (opt.);
  - **Billing address:** street, apt (opt.), city, province, postal, country (Canada) — через хелпер `mhAddrFields()`;
  - **Shipping address:** чекбокс «Shipping address is the same as billing» (**увімкнено за замовч.** → shipping прихований; `membersToggleShipping`); зняття показує той самий набір адресних полів;
  - fine-print про CFIA (no shipping outside Canada; no fruit trees/grapes to BC).
- **Через реєстрацію збирається адреса**, тож у compose-popup **поля Location більше немає** — замість нього хінт «Location is added automatically from your account».

**Signed-in стан (`membersApplyAuth`, мок):**
- Join-банер → «Signed in as {ім'я} · Log out».
- Усі `.sg-signin-note` сховані.
- **Quick Add / Publish** → без гейта: toast («Posted to the community» / «Published to the gallery»), поле очищується / popup закривається.
- **Reply** → активна textarea + «Post reply»; публікація додає коментар у тред (мок) + toast.
- `MH_SIGNED_IN` / `MH_USER` — мок-прапорці; `membersLogout()` повертає гостьовий стан (для перегляду обох станів).

---

## 10a. 🔜 ЗАВТРА: Account popup у хедері (ще НЕ реалізовано)

Клік на іконку **Account** у хедері (`data-comment="header-action-user"` — SVG «людина» в `header-actions`, є на всіх сторінках) відкриває **невеликий popup** з логіном + можливістю зареєструватись. Це окремий, компактний popover — **НЕ** повноекранний `.lb` і **НЕ** `members-gate`.

**Стан «гість» — вміст popover:**
- Заголовок «Log in».
- Соц-логіни (перевикористати `.auth-provider` + `membersSocialAuth`): Google / Apple / Facebook.
- divider «or».
- Email + Password + кнопка **Log in** (мок → `membersGateLogin`).
- «Forgot password?» link (у проді — magic-link, узгоджено з checkout-спекою §3 «magic-link»).
- Низ: «New to Whiffletree? **Sign up**» → викликає наявний `openSignup()` (повна реєстрація).

**Стан «залогінений» — той самий popover стає account-меню:**
- «Signed in as {MH_USER.name}».
- Пункти: My account · My posts · Orders · **Log out** (`membersLogout`).

**Технічні нотатки для старту:**
- Позиціонування: dropdown-popover, прив'язаний під іконкою (patttern як у mega-nav панелей, АБО простий absolute-popover у `header-actions`; `header-actions` треба зробити `position:relative`). Ширина ~320px.
- Поведінка: клік поза popover — закрити; ESC — закрити; focus-trap; `aria-expanded` на іконці.
- **Переюзати вже готове:** `membersGateLogin`, `openSignup`, `membersSocialAuth`, `membersApplyAuth`, `membersLogout`, `MH_SIGNED_IN`/`MH_USER`, класи `.auth-provider`, `.auth-divider`, `.sg-btn`, `.sg-linkbtn`, `.sg-input`, `.sg-field`.
- `membersApplyAuth()` розширити: крім join-банера, оновлювати і вміст цього popover (гість ↔ account-меню).
- **Область прототипу:** іконка Account є на index/catalog/product/members, але вся auth-логіка (скрипти `MH_*`) живе лише в `members.html`. Рішення на завтра: (а) реалізувати спершу тільки на `members.html`; (б) у проді винести auth у спільний скрипт для всіх сторінок; стан акаунту в статиці між сторінками НЕ шариться (обмеження прототипу — зазначити).
- Не забути: іконку Account зробити клікабельною (зараз це просто SVG без обробника).

---

## 11. Порядок робіт

1. `MH_POSTS` (дані) + перепідключення карток на `openPost(id)`.
2. Popup: карусель (photo-режим) + reading-режим (одна колонка, стаття).
3. Секція коментарів + reply-гейт.
4. Discussion-картки у стрічці + фільтр типу `All · Photos · Discussions`.
5. Банер гейтингу + узгодження копі.
6. Sticky-шапка + reading-progress у reading-режимі.
7. Перевірка через DOM-інспекцію (скріншоти в цьому прев'ю чорні — інспектуємо DOM), + мобайл-брейкпоінти.

---

## 12. Acceptance checklist

- [ ] Фото-пост відкривається у popup із **кількома фото** (карусель) — закриває #102.
- [ ] Є **текстові пости**: у стрічці тизер 3–4 рядки, у popup — near-fullscreen стаття абзацами — закриває #104 (частина «text only posts»).
- [ ] Пост має **коментарі з відповідями** (1 рівень) — закриває #104 (частина «reply with threads»).
- [ ] **Чітко видно**, що для публікації/відповіді треба залогінитись/створити акаунт — закриває #103.
- [ ] Reading-режим відповідає числам §8 (ширина ~66ch, body ~19px, LH ~1.7, відступи абзаців 2×).
- [ ] Працює на мобайлі; a11y (dialog, focus, ESC) збережено.
- [ ] Зачеплено тільки `members.html`; інші сторінки без змін.

---

## 13. Референс: правила ієрархії з живої blog-сторінки (Atlantic Express)

Розібрана реальна стаття-лонгрід. Правила візуальної ієрархії, які звідти беремо:

1. **Вхід = картка-шапка** — контрастний блок із мікро-ієрархією: `категорія-пілюля + дата` над великим заголовком. (У нас: eyebrow-тема + byline + H1.)
2. **Два стовпці: контент + sticky ToC** — вузька колонка-зміст з якорями на секції, активний пункт підсвічено. → **додаємо** як опцію для довгих постів (або лишаємо sticky-шапку зі стислим заголовком).
3. **Три рівні тексту:** H2-секція (велика, темна, великий відступ зверху) → **bold lead-речення** (теза секції) → body (світліше, зліва, вузька міра). → **додаємо правило bold-тези під кожним H2**.
4. **Інлайн-лінки** — єдиний яскравий текст у потоці, акцентним кольором.
5. **Два типи списків:** прості `•` (короткі факти) та **вкладені `✓`** під bold-батьком (деталі по групах). → у стиль-гайд тіла.
6. **Breathers** — зображення на всю ширину контенту (заокруглене) + інлайн-CTA блок посеред статті. Розбивають щільний текст і дають точку конверсії.
7. **Related у кінці** — «Вас також може зацікавити»: картки `категорія + дата + заголовок + Читати далі`. → **додаємо** «More from the community» під коментарями.
8. **Один акцент наскрізно** — заголовки/кнопки/лінки/іконки одним кольором; решта нейтральна. Ієрархія тримається на **розмір + жир + акцент**, не на багатьох кольорах. (У нас: `--g700`/`--c600`.)
9. **Відступи = роздільники** — секції відділяє повітря, не лінії; великий відступ перед H2 = нова тема.

**Що це додає до спеку (§7b/§8):** sticky-ToC для довгих постів; bold lead-речення в секціях; related-блок «More from the community» у кінці popup; правило `•` vs `✓` списків.

---

## 14. Джерела (best practices)

- Optimal Line Length 50–75 — UXPin (2026): https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/
- Optimal Line Length — Baymard: https://baymard.com/blog/line-length-readability
- Best Font Sizes for Readability — greadme: https://www.greadme.com/blog/seo/best-font-sizes-for-readability-complete-guide
- Best UX practices for line spacing — Justinmind: https://www.justinmind.com/blog/best-ux-practices-for-line-spacing/
- The Perfect Text Readability Recipe — Bootcamp/Medium: https://medium.com/design-bootcamp/the-perfect-text-readability-recipe-science-backed-typography-for-better-ux-7c8bf190df85
- USWDS Typography: https://designsystem.digital.gov/components/typography/
- Anatomy of a Blog Article — Media Junction: https://www.mediajunction.com/blog/blog-article-anatomy
