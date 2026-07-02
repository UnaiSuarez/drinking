# 🍻 EL RANKING — Documento de Diseño Completo

> App para grupos de amigos: registrar lo que bebe cada uno durante una noche,
> revelar un podio sorpresa al final, y competir a lo largo del año con
> temporadas, logros, medallas y avatares personalizables.

---

## 1. Concepto y pilares

**Pilares de diseño (si una feature no cumple ninguno, fuera):**

1. **Usable borracho** — botones enormes, cero texto pequeño, máximo 1 tap para lo importante.
2. **El pique es el producto** — todo genera comparación, sorpresa o cachondeo entre amigos.
3. **Dos progresiones** — la competitiva (se resetea por temporada, genera pique) y la de colección (solo crece, genera apego).
4. **Sorpresa ritual** — el podio del final de la noche es EL momento. Se protege: nada de spoilers si no quieres.

---

## 2. Estructura: Salas y Noches

### Salas (permanentes)
- Un grupo de amigos = una sala. Se crea una vez y vive para siempre.
- Código de invitación de 6 caracteres + link/QR compartible.
- La sala contiene: miembros, histórico de noches, temporada activa, rankings, feed.
- Roles: **Fundador** (creador), **Admins** (pueden iniciar/cerrar noches, echar gente), **Miembros**.
- Un usuario puede estar en varias salas (grupo del pueblo, grupo de la uni...), con perfil y logros globales pero rankings por sala.
- Ajustes de sala: quién puede iniciar noches, duración por defecto, bebidas personalizadas (ej: "el cóctel de Dani"), si el ranking en vivo es visible u oculto, y el **balance de liga personalizable** (todos los valores de PL y umbrales de división, con botón de restaurar predeterminados — ver §4.1).

### Noches (eventos)
1. **Inicio**: un admin pulsa "Iniciar noche". Elige duración (4h / 6h / 8h / hasta hora fija) — cierre automático al terminar, y cierre manual anticipado disponible para admins.
2. **Convocatoria**: notificación push a toda la sala: "🌙 ¡Noche iniciada en [sala]! ¿Sales hoy?". Cada uno decide **unirse o no**. Quien no se une, no cuenta ni le afecta (no baja medias, no aparece en el podio).
3. **Durante**: pantalla de botones + feed en vivo + ranking en vivo (configurable: visible / oculto hasta el final / oculto solo el top 3 para mantener la sorpresa).
4. **Cierre**: automático o manual. Nadie puede registrar más.
5. **El Podio** (momento estrella):
   - **Votación relámpago** (~20s): categoría sorpresa de la noche, todos votan a la vez desde el móvil (ver §4.4).
   - Resultado de la votación revelado como aperitivo.
   - Cuenta atrás de 3s con vibración.
   - Revelado del último al primero, con pausa dramática antes del 1º.
   - Avatares en el podio con sus animaciones de victoria/derrota.
   - Lluvia de confetti para el ganador, y entrega de logros desbloqueados esa noche uno a uno.
   - Botón "Compartir resumen" → genera imagen bonita para el WhatsApp.
6. **Modo retro**: registrar una bebida "de hace un rato" (±2h) por si se te olvidó — marcada con icono 🕐 en el feed para que no haya trampas silenciosas.

### Anti-trampas (ligero, esto es entre amigos)
- El feed en vivo es público dentro de la noche: si alguien mete 14 chupitos en 1 minuto, el grupo lo ve y lo juzga 😄.
- Botón "deshacer" (30 segundos) por si le das sin querer.
- Los admins pueden anular registros obviamente falsos al cerrar la noche.

---

## 3. Bebidas y puntuación

### Catálogo base (cada sala puede añadir personalizadas)

| Bebida | Icono | Puntos | Alcohol aprox. |
|---|---|---|---|
| Cerveza / caña | 🍺 | 1 | 1 UBE* |
| Pinta / litro | 🍻 | 2 | 2 UBE |
| Chupito | 🥃 | 2 | 1 UBE |
| Cubata / copa | 🍹 | 3 | 2 UBE |
| Vino / sangría (copa) | 🍷 | 1 | 1 UBE |
| Kalimotxo / tinto de verano | 🍇 | 1 | 1 UBE |
| Shot especial (jäger, tequila...) | 💀 | 2 | 1 UBE |
| Agua / refresco | 💧 | 0 | 0 (¡pero cuenta para logros!) |

\* UBE = Unidad de Bebida Estándar (~10g alcohol). Se usa solo para stats curiosas ("has bebido el equivalente a X"), **no** para sermonear.

- **Puntos** = lo que decide el podio de la noche. Configurable por sala si quieren otro baremo.
- El botón de **agua 💧** existe a propósito: da 0 puntos pero alimenta logros ("Hidratado") y hace gracia en el feed.

---

## 4. Sistema competitivo

### 4.1 Puntos de Liga (PL) y divisiones

**Filosofía del sistema** (decisiones tomadas tras iterar mucho):
1. **Acumulación pura**: el PL solo suma. Quien tiene más PL total nunca está por debajo de quien tiene menos. Sin medias, sin percentiles, sin porcentajes raros.
2. **Umbrales calibrados para el peor caso**: la escalera de divisiones está diseñada para poder completarse en **~5 noches buenas**. Un grupo que sale poco no se queda estancado en Bronce; un grupo que sale mucho satura arriba, y ahí la competición pasa a ser por el trono único de Challenger (como en LoL: Maestro es un umbral, Challenger es una carrera).
3. **Rendimiento decreciente en volumen**: las primeras bebidas puntúan mucho (progresar es fácil), las últimas casi nada (nadie se mata a beber "por puntos").
4. Todos los números de esta sección son **constantes de configuración**: tras una temporada real, se retocan como un parche de balance.

#### Cómo se gana PL (cuatro fuentes)

**A) Volumen — con rendimiento decreciente**

| Bebida de la noche | PL | Acumulado |
|---|---|---|
| 1ª – 5ª | +5 cada una | 25 |
| 6ª | +4 | 29 |
| 7ª | +3 | 32 |
| 8ª | +2 | 34 |
| 9ª en adelante | +1 cada una | 34 + n |

Las primeras bebidas son las que más valen → cualquiera que salga y beba algo progresa. A partir de la 9ª casi no dan PL → beber en exceso no es estrategia (aunque toda bebida sigue contando para stats, récords y logros).

**B) Posición — el podio de la noche**

| Posición | PL |
|---|---|
| 1º | +15 |
| 2º | +10 |
| 3º | +6 |
| Resto que participó | +3 |
| Te uniste, 0 bebidas | +2 (por presencia, siempre suma algo) |

**C) Votación del grupo** *(ver §4.4)*

```
+5 PL por CADA voto recibido
```
Simple y directo: Marcos vota a Pol → +5 para Pol. Dani también vota a Pol → +5 más. Laura vota a Dani → +5 para Dani. Cuantos más sois en la sala, más PL hay en juego por votación — escala solo con el tamaño del grupo.

**D) Logros desbloqueados esa noche**

| Rareza | PL |
|---|---|
| Común | +2 |
| Rara | +4 |
| Épica | +8 |
| Legendaria | +15 |

Los logros **repetibles 🔁** (ver §6) dan sus PL **cada vez** que se consiguen — incluso varias veces en la misma noche si son por tramos (ej. "Ronda Torera" a los 5, 10 y 15 chupitos = 3 medallas = +6 PL).

**Ejemplo de una noche** (bebes 6 cosas, quedas 2º, recibes 2 votos, cae un logro raro):
```
Volumen:   5×5 + 4  = 29 PL
Posición:  2º       = 10 PL
Votación:  2 votos  = 10 PL
Logro raro:            4 PL
─────────────────────────
TOTAL noche:          53 PL
```
Referencias: noche floja ≈ 15-25 PL · noche normal ≈ 30-40 PL · noche dominante ≈ 60-75 PL.

#### Divisiones — umbrales fijos, pensados en "noches"

| División | PL | Traducido a noches | Estética |
|---|---|---|---|
| 🪨 Bronce Resacoso | 0 – 49 | Donde empiezas. Una noche decente y sales | Marco de piedra agrietada, charco |
| 🥂 Plata Tambaleante | 50 – 124 | ~2-3 noches normales | Marco plateado torcido |
| 🍺 Oro Litrona | 125 – 209 | ~4-5 noches normales o 3 buenas | Marco dorado con espuma |
| 💎 Diamante Etílico | 210 – 299 | ~4-5 noches ganando | Marco de cristal con burbujas |
| 🔥 Maestro Cubata | 300+ | ~5 noches dominándolas | Marco animado con llamas |
| 👑 Challenger del Vodka | **El nº1 en PL de la sala, con mínimo 300** | Único. Trono vacante si nadie llega | Corona animada |

**Por qué funciona con cualquier ritmo de grupo:**
- **Grupo que sale 5 veces por temporada**: el dominante acaba con ~250-300 PL (Diamante/Maestro, y quizá el trono), el normal ~150-175 (Oro), el tranquilo ~80-100 (Plata). Todo el rango de divisiones en juego. Nadie estancado en Bronce.
- **Grupo que sale 20 veces**: varios superan 300 y son Maestro — pero el trono sigue siendo de **uno solo**: entre los Maestros se compite por PL total y el Challenger puede cambiar de manos cada noche.
- El **reset de temporada** (cada 3 meses, §4.2) evita que la inflación se acumule para siempre.
- La división se muestra junto al nombre en todas partes (ranking, feed, perfil) y se congela en tu historial al acabar la temporada.

**Ejemplo — temporada de 5 noches, 5 amigos:**

| Jugador | N1 | N2 | N3 | N4 | N5 | Total | División |
|---|---|---|---|---|---|---|---|
| Marcos | 65 | 58 | 72 | 38 | 62 | **295** | 💎 Diamante — a 5 PL de Maestro, se le escapó el trono en la última noche |
| Laura | 45 | 68 | 30 | 55 | 50 | **248** | 💎 Diamante |
| Pol | 18 | — | 75 | — | 70 | **163** | 🍺 Oro — solo salió 3 noches, pero 2 las reventó |
| Dani | 32 | 38 | 25 | 30 | 35 | **160** | 🍺 Oro — el constante que nunca falla |
| Ana | 24 | 20 | — | 26 | 12 | **82** | 🥂 Plata |

Trono **vacante** esta temporada: nadie llegó a 300. Marcos se quedó a 5 PL → material de cachondeo para el grupo y gasolina para la siguiente temporada.

#### Balance personalizable por sala

Todos los números de este sistema vienen **predeterminados** con los valores de arriba, pero los **admins de la sala pueden ajustarlos** desde "Ajustes → Balance de liga":

- **Editable**: PL por bebida y curva de rendimiento decreciente, PL por posición (1º/2º/3º/resto/presencia), PL por voto recibido, PL por rareza de logro, umbrales de cada división y mínimo de PL para Challenger.
- **Botón "Restaurar valores predeterminados"** 🔄: un tap y todo vuelve al balance oficial (con confirmación, y aviso en el feed de la sala: "Dani ha reseteado el balance de liga").
- **Transparencia**: cualquier cambio de balance se anuncia en el feed de la sala con el detalle de qué se ha tocado — nada de que el admin se suba los puntos de chupito en secreto 😄.
- **Efecto retroactivo dentro de la temporada**: como el PL siempre se puede recalcular desde los registros, al cambiar el balance se recalcula toda la temporada actual con las reglas nuevas (así el ranking es coherente, sin mezcla de noches con reglas distintas). Las temporadas ya cerradas no se tocan jamás.
- **Restricción**: no se puede cambiar el balance mientras hay una noche activa (para evitar trampas en caliente).
- La UI de edición muestra al lado de cada campo el valor por defecto en gris ("predeterminado: +5") para orientarse siempre.

### 4.2 Temporadas

- Duración: **3 meses** (4 al año: Invierno, Primavera, Verano — la gorda —, Otoño).
- Cada temporada tiene **nombre y medalla exclusiva** (ej: "T1 2026 — La Génesis").
- Al acabar:
  - Se congela tu división final → queda en tu perfil para siempre ("T2: Oro I").
  - **Recompensas por división final**: cosmético exclusivo e irrepetible (borde de avatar, título). El borde de Diamante de la T2 no se podrá conseguir jamás de nuevo → coleccionismo real.
  - Reset de PL con arrastre suave: empiezas la siguiente con PL = 10% de los finales (el bueno mantiene ventaja simbólica, el malo tiene esperanza).
- **Lo que nunca se resetea**: totales históricos, logros, nivel de cuenta, cosméticos.

### 4.3 Rankings múltiples (pestañas en la sala)

1. **🏆 Liga** — PL de la temporada actual (el principal).
2. **📊 Volumen** — total de bebidas de la temporada.
3. **⚡ Velocidad** — mejor marca de bebidas/hora en una noche.
4. **🌈 Diversidad** — tipos distintos probados.
5. **📅 Asistencia** — % de noches a las que te has unido.
6. **♾️ Histórico** — total de por vida (nunca se resetea, la "leyenda").

### 4.4 Votación nocturna

Justo antes de revelar el podio, y antes de que nadie sepa el resultado, aparece **una votación relámpago** (dura ~20 segundos, todos votan a la vez desde su móvil):

```
🎯 Categoría de esta noche: "El más divertido"

  [Marcos]     [Laura]     [Dani]     [Ana]
```

- **Cada noche se sortea 1 categoría** de una lista de 8 (rota, así nunca sabes cuál te va a tocar):
  1. 💀 El más borracho
  2. 😂 El más divertido
  3. 🤝 Mejor compa de la noche
  4. 🚀 MVP (elección libre)
  5. 🔍 El descubierto (parecía sobrio y no lo estaba)
  6. 🤦 El saboteador (la cagada más graciosa)
  7. 🎯 El más consistente
  8. 🦸 El momento más heroico
- No puedes votarte a ti mismo.
- El resultado se revela **justo antes del podio**, como aperitivo — genera un pico de cachondeo grupal previo al momento estrella.
- Cada voto recibido da **+5 PL** directamente a quien lo recibe (sin cálculos: 3 votos = +15 PL). El más votado se lleva además el título de la categoría, que queda registrado como mini-logro de esa noche visible en el resumen compartible.
- Esta votación **no afecta el podio de bebidas** (que sigue siendo solo por consumo/puntos de bebida) — son dos cosas distintas que sumas al final: quién bebió más, y quién ganó el corazón del grupo.

### 4.5 Estadísticas de perfil (el "KDA" bebido)

- **DPN** — *Drinks Per Night*: media de bebidas por noche. Tu stat de honor.
- **Ratio C/C** — Cubatas/Chupitos: define tu "clase" → si >1.5 eres "Sibarita 🍹", si <0.5 eres "Kamikaze 🥃", intermedio "Equilibrado ⚖️".
- **Winrate** — victorias / noches.
- **BDA** — (Bebidas totales + Victorias×3) / Noches. El número absurdo para discutir quién es mejor "objetivamente".
- **Racha** — noches consecutivas asistidas.
- Bebida favorita, mejor noche (récord personal), hora media de última bebida, nemesis (contra quién pierdes más).

---

## 5. Niveles y experiencia (progresión de colección)

- **XP por acción**: registrar bebida (+5), unirse a noche (+20), acabar noche (+30), ganar (+100), logro común/raro/épico/legendario (+25/+75/+200/+500).
- Curva: nivel N requiere `100 × N^1.4` XP (nivel 10 asequible el primer mes, nivel 50 es de veterano).
- **Cada nivel da algo**: moneda cosmética, ítem de avatar, o color de nombre. Nunca un nivel vacío.
- Hitos gordos: nivel 10 (gafas de sol), 25 (marco animado), 50 (título "Leyenda de la Barra"), 100 (avatar dorado).

---

## 6. LOGROS — el catálogo completo

### Rarezas

| Rareza | Color | Estética | XP |
|---|---|---|---|
| Común | Gris | Chapa metálica plana | +25 |
| Rara | Azul | Esmalte azul con brillo | +75 |
| Épica | Morada | Gema morada con partículas | +200 |
| Legendaria | Dorada | **Animada**, rayos dorados, sonido propio | +500 |

Muchos logros son **escalonados** (I, II, III, IV): misma medalla que evoluciona de bronce → plata → oro → diamante.

### Únicos vs. Repetibles 🔁

Hay dos clases de logro:

- **Únicos** — se consiguen una vez y quedan para siempre. Son los hitos de por vida (Cervecero, El Océano...), los secretos y los de temporada. Marcan momentos irrepetibles.
- **Repetibles 🔁** — son medallas que se **acumulan**: cada vez que cumples la condición, ganas otra copia. La medalla muestra un contador (**💀 Kamikaze ×4**). Se pueden repetir en noches distintas **e incluso varias veces en la misma noche** si la condición es por tramos.

**Reglas de los repetibles:**
- Cada repetición da sus PL y XP completos (son la fuente de "farmeo" divertido de la liga).
- El contador es histórico y nunca se resetea (ni entre temporadas) — tu colección solo crece.
- En la vitrina y el perfil se muestra el contador: presumir de "Ronda Torera ×23" es el objetivo.
- Ranking oculto por logro: al tocar una medalla ves quién de la sala tiene más copias de esa medalla → mini-competición dentro de cada logro.

**Repetibles por tramos (varias veces por noche):**

| Logro 🔁 | Condición (cada vez que...) | Rareza |
|---|---|---|
| 🥃 **Ronda Torera** | ...acumulas 5 chupitos en la noche (5, 10, 15... = 1 medalla cada tramo) | Común |
| 🍺 **Media Docena** | ...acumulas 6 cervezas en la noche | Común |
| 🍹 **Póker de Copas** | ...acumulas 4 cubatas en la noche | Común |
| 🌀 **Combo** | ...registras 3 bebidas distintas seguidas sin repetir | Rara |
| ⏰ **Happy Hour** | ...metes 3 bebidas dentro de una misma hora en punto | Rara |

**Repetibles por noche (máx. 1 por noche, pero acumulan entre noches):**
Kamikaze 💀, Sprint ⚡, Turbo 🚀, Degustador 🌈, Búho 🦉, Madrugador 🕐, Hidratado 💧, El Fantasma 👻, Gallina 🐔, Sobrio Designado 🧊, La Remontada 🔄, Gemelos 🤝, Grillo 🦗, Lunes de Oficina 💼, La Siesta 🛌 — todos pasan a ser 🔁 con contador.

Los de racha/histórico (Tricampeón, Dinastía, Eterno Segundón, los escalonados de volumen, los secretos y los de temporada) siguen siendo **únicos**.

### 📦 Volumen (de por vida, escalonados)

| Logro | Condición | Rareza final |
|---|---|---|
| 🍺 **Cervecero** I–IV | 50 / 250 / 1.000 / 5.000 cervezas | Común → Legendaria |
| 🥃 **Centurión** I–IV | 25 / 100 / 500 / 1.000 chupitos | Común → Legendaria |
| 🍹 **Coctelero** I–IV | 25 / 100 / 500 / 1.000 cubatas | Común → Legendaria |
| 🌊 **El Océano** | 1.000 bebidas totales | Épica |
| 🗿 **Monumento Nacional** | 5.000 bebidas totales | Legendaria |
| 🌈 **Enciclopedia Etílica** | Probar todos los tipos del catálogo | Rara |

### 🌙 De una noche

| Logro | Condición | Rareza |
|---|---|---|
| 💀 **Kamikaze** | 10+ bebidas en una noche | Rara |
| ☠️ **Leyenda Suicida** | 15+ bebidas en una noche | Épica |
| ⚡ **Sprint** | 3 bebidas en 30 min | Común |
| 🚀 **Turbo** | 5 bebidas en 1 hora | Rara |
| 🌈 **Degustador** | 5 tipos distintos en una noche | Común |
| 🦉 **Búho** | Registrar después de las 6:00 | Rara |
| 🕐 **Madrugador** | Primera bebida del grupo antes de las 20:00 | Común |
| 🎯 **Francotirador** | Ganar registrando solo un tipo de bebida | Rara |
| 💧 **Hidratado** | Alternar agua entre cada bebida toda la noche | Rara |
| 🧱 **El Muro** | 8+ bebidas y seguir registrando a ritmo constante hasta el cierre | Épica |

### 🎭 Sociales y de comedia (el alma de la app)

| Logro | Condición | Rareza |
|---|---|---|
| 👻 **El Fantasma** | Unirse a la noche y registrar 0 bebidas | Común |
| 🐔 **Gallina** | Última bebida antes de las 00:00 y desaparecer | Común |
| 📵 **Desaparecido en Combate** | Nada registrado en las últimas 2h de una noche larga | Común |
| 🧊 **Sobrio Designado** | 0 bebidas alcohólicas pero agua/refresco hasta el cierre | Rara (medalla de honor, aureola) |
| 🥈 **Eterno Segundón** | Quedar 2º cinco veces sin ganar nunca | Épica |
| 📉 **En Horas Bajas** | Quedar último 3 noches seguidas | Rara (medalla de vergüenza equipable 😄) |
| 🔄 **La Remontada** | Ir último a mitad de noche y acabar en podio | Épica |
| 👑 **Tricampeón** | Ganar 3 noches seguidas | Épica |
| 🐉 **Dinastía** | Ganar 5 noches seguidas | Legendaria |
| 🤝 **Gemelos** | Acabar empatado a bebidas con otro jugador | Rara |
| 🎂 **Cumpleañero Legendario** | Ganar la noche de tu cumpleaños | Épica |
| 😇 **Cumpleañero Responsable** | Ser el que menos bebe en tu propio cumpleaños | Rara |
| 🦗 **Grillo** | Ser el único que se une a una noche | Rara |
| 🃏 **El Caballo Negro** | Ganar tu primera noche en la sala | Común |
| 💼 **Lunes de Oficina** | Participar en una noche de domingo a jueves | Común |
| 🛌 **La Siesta** | Hueco de 3+ horas entre dos registros tuyos en la misma noche | Rara |

### 📅 De constancia y temporada

| Logro | Condición | Rareza |
|---|---|---|
| 🔥 **En Racha** I–III | 3 / 5 / 10 noches consecutivas asistidas | Común → Épica |
| 🗓️ **Fijo de la Casa** | 90% asistencia en una temporada | Épica |
| 🏔️ **Escalador** | Subir 2 divisiones en una temporada | Rara |
| 🏆 **Campeón de Temporada** | Acabar 1º de la liga | Legendaria |
| 🐢 **Lento pero Seguro** | Acabar temporada sin ganar ni una noche pero en top 3 de liga | Épica |
| 🎖️ **Veterano** I–IV | 10 / 50 / 100 / 250 noches totales | Común → Legendaria |

### ❓ Secretos (se muestran como "???" con silueta — generan especulación)

| Logro | Condición oculta | Rareza |
|---|---|---|
| 🎰 **El Jackpot** | Exactamente 7 bebidas un día 7 | Rara |
| 🪞 **El Espejo** | Copiar exactamente la secuencia de bebidas de otro jugador toda la noche | Épica |
| 🕛 **Cenicienta** | Registrar tu última bebida exactamente a las 00:00 | Rara |
| 🌕 **Licántropo** | Ganar una noche de luna llena | Épica |
| 💯 **El Perfecto** | Que tu bebida sea la nº100 de la noche del grupo | Rara |
| 🔢 **111** | Llegar a exactamente 111 bebidas históricas | Rara |
| 🥶 **Año Nuevo Congelado** | 0 bebidas en Nochevieja estando unido | Legendaria |

**Total lanzamiento: ~60 logros.** Se añaden 5–10 por temporada para mantener frescura.

---

## 7. Premios y desbloqueables

### Qué desbloquean logros, niveles y temporadas

1. **🖼️ Marcos de avatar**: madera → plata → oro → neón → llamas animadas → corona Challenger. Los de fin de temporada son irrepetibles.
2. **📛 Títulos equipables** (bajo tu nombre): "El Fantasma", "Rey del Chupito", "Eterno Segundón", "Leyenda de la Barra", "Campeón T2"... Tú eliges cuál lucir.
3. **🏅 Vitrina**: eliges **3 medallas destacadas** que ven todos al abrir tu perfil. La vitrina es tu carta de presentación.
4. **👕 Cosméticos de avatar**: ropa, gafas, sombreros, mascotas (un flamenco hinchable, una litrona parlante...), fondos de perfil.
5. **🕺 Animaciones de victoria** para el podio: baile, dab, desmayo dramático, beso al público, micrófono drop.
6. **🎨 Colores/efectos de nombre** en el feed en vivo (nivel alto = nombre con gradiente animado).
7. **🪙 Chapas** (moneda blanda): se ganan con XP y noches; compran cosméticos comunes en la "Tienda del Bar" (rotación semanal, TODO gratis — no hay dinero real, las chapas solo se ganan jugando).

### Perfil de usuario (vista al tocar a alguien)

```
┌────────────────────────────────────┐
│   [Avatar animado + marco llamas]  │
│   Marcos  «El Fantasma»            │
│   Nivel 23 · 💎 Diamante II        │
├────────────────────────────────────┤
│   🏅 VITRINA:  💀  ⚡  👑           │
├────────────────────────────────────┤
│   DPN 4.2 · C/C 2.1 (Sibarita 🍹) │
│   Winrate 21% · BDA 5.8            │
│   Noches 34 · Victorias 7          │
│   Favorita: 🥃 · Récord: 14        │
│   T1 🥂Plata I · T2 🍺Oro III      │
│   Logros: 23/61  ▓▓▓▓▓▓░░░░       │
└────────────────────────────────────┘
```

---

## 8. Avatares

### Sistema por capas (v1)
- Base: cuerpo, tono de piel, cara, pelo, ropa arriba/abajo, accesorio. Combinatoria de SVG por capas → miles de combos, peso mínimo.
- Editor tipo "muñeco en el centro + carrusel de opciones por categoría".

### Estados de embriaguez (v1.5) — la joya
El avatar **cambia solo** según tus bebidas de la noche:

| Estado | Bebidas (aprox.) | Aspecto |
|---|---|---|
| 😀 Sobrio | 0–2 | Postura recta, sonrisa |
| 🥴 Piripi | 3–5 | Mejillas rojas, media sonrisa, leve balanceo |
| 🍷 Contento | 6–8 | Ojos entrecerrados, tambaleo, corbata en la cabeza |
| 💫 Fino | 9–11 | Estrellitas orbitando, camina en zigzag (idle animation) |
| 💀 KO | 12+ | Tirado en el suelo, espiral en los ojos, "zZz" |

En el ranking en vivo se ven los avatares de todos con su estado → información y comedia a la vez.

### Animaciones (v2)
- Idle por estado (respirar, balancearse, hipo).
- Reacción al registrar bebida (traga, brinda, escupe fuego si es chupito 💀).
- Victoria/derrota en el podio (desbloqueables).
- Tecnología: **Rive** (ideal: máquinas de estados anidadas, ligero) o Lottie como plan B.

---

## 9. Estilo visual

### Dirección de arte: **"Neón de bar arcade"**
Fiesta nocturna + arcade retro. Oscuro de base (se usa de noche, en bares — nada de fogonazos blancos), con neones vibrantes como acento.

### Paleta

| Uso | Color | Hex |
|---|---|---|
| Fondo principal | Azul noche casi negro | `#0D0E1A` |
| Fondo tarjetas | Azul oscuro elevado | `#1A1C2E` |
| Acento primario (CTA, ganador) | Ámbar cerveza neón | `#FFB627` |
| Acento secundario (realtime, links) | Cian eléctrico | `#2DE2E6` |
| Pique/peligro (chupitos, rachas) | Rosa neón | `#FF2E93` |
| Éxito | Verde lima | `#9BF00B` |
| Texto principal | Blanco cálido | `#F5F1E8` |
| Texto secundario | Gris azulado | `#8A8FA8` |
| Oro / Plata / Bronce podio | `#FFD54A` / `#C7CCDB` / `#CD7F32` |

Gradientes de neón (ámbar→rosa) reservados para momentos especiales: podio, logro legendario, subida de división.

### Tipografía
- **Títulos y números gordos**: *Lilita One* o *Titan One* (redonda, gruesa, divertida — rollo cartel de feria).
- **Cuerpo/UI**: *Nunito Sans* o *Inter* (legibilidad máxima).
- Números de contador: tabulares y ENORMES (mín. 48px el contador propio).

### Iconografía
- **Bebidas**: iconos propios ilustrados estilo **flat con borde grueso (2.5–3px) y brillo especular** — como stickers/chapas de esmalte. Fondo circular de color por categoría. Generables con IA (ver §10) y retocados para consistencia.
- **UI general**: [Phosphor Icons](https://phosphoricons.com) o Lucide en peso "bold" — coherentes con el borde grueso.
- **Medallas**: forma física de chapa/medalla con cinta. La rareza se lee de un vistazo: gris plano → azul esmaltado → morado con gema → dorado animado con rayos.

### Componentes clave
- **Botones de bebida**: círculos de ~96px mínimo, grid 2×4, icono + nombre corto. Al pulsar: escala 0.9 → rebote, vibración háptica, `+1` flotante, sonido "glup" (silenciable).
- **Tarjetas de ranking**: avatar + marco + nombre + título + barra de puntos con animación de relleno.
- **Podio**: escalones 3D-fake con iluminación de neón desde abajo, spotlight sobre el 1º.
- **Feed en vivo**: burbujas tipo chat con timestamp, iconos de bebida inline, colores de nombre.
- Esquinas redondeadas generosas (16–24px), sombras con glow de color en vez de sombra negra.

### Ilustraciones e imágenes
- **Estilo unificado**: cartoon 2D, trazo grueso, colores planos con 1 nivel de sombra, personajes cabezones (proporción 1:2.5 cabeza:cuerpo) — expresivos en tamaños pequeños.
- Pantallas vacías con ilustraciones graciosas: sala sin noches = bar cerrado con gato durmiendo; sin logros = vitrina con telarañas.
- Splash/onboarding: skyline nocturno con neones de la ciudad.

### Generación de assets con IA (flujo)
1. Definir el prompt-base de estilo una sola vez, ej.: *"flat cartoon sticker illustration, thick dark outline, enamel pin style, vibrant neon palette on dark background, no text"*.
2. Generar en lotes por categoría (bebidas, medallas comunes, medallas épicas...) manteniendo el prompt-base → consistencia.
3. Post-proceso: quitar fondos, ajustar paleta a los hex oficiales, exportar SVG/WebP.
4. **Los assets se generan en desarrollo y se guardan estáticos** — nunca generación en tiempo real (coste, latencia, inconsistencia).

### Microinteracciones y sonido
- Háptica en todo registro (corta) y en logro (patrón largo).
- Confetti físico (canvas-confetti) en podio y legendarias.
- Paquete de ~8 sonidos cortos: glup, brindis, fanfarria de podio, "achievement unlocked" (rollo Xbox), tick de countdown. Toggle global de sonido.
- Animación de subida de división: pantalla completa, marco antiguo se rompe → aparece el nuevo.

### Accesibilidad nocturna
- Modo por defecto oscuro SIEMPRE (no hay modo claro en v1, decisión de producto).
- Contraste AA mínimo en texto sobre fondos.
- Zonas táctiles ≥ 48px, lo importante en la mitad inferior de la pantalla (alcance del pulgar).

---

## 10. Arquitectura técnica

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | **Next.js 15 + PWA** (Serwist) | Instalable sin stores, offline-first |
| UI | Tailwind CSS 4 + Framer Motion | Velocidad + animaciones |
| Avatares/animación | Rive (o Lottie) | Máquinas de estado para embriaguez |
| Backend | **Supabase** | Postgres + Auth + Realtime + Storage |
| Auth | Google One-Tap + magic link | Cero contraseñas |
| Realtime | Supabase Realtime channels | Feed y ranking en vivo |
| Push | Web Push (VAPID) | "¡Noche iniciada!" — funciona en iOS ≥16.4 instalada |
| Hosting | Vercel | Deploy con git push, dominio propio |
| Imágenes compartibles | @vercel/og o satori | Resumen de noche para WhatsApp |

**Instalación por los amigos**: se comparte el link → Chrome/Safari ofrecen "Añadir a pantalla de inicio" → icono propio, pantalla completa, push, offline. Actualizaciones automáticas con cada deploy.

## 11. Modelo de datos

```
usuarios         (id, auth_id, nombre, avatar_config jsonb, nivel, xp, chapas,
                  titulo_equipado, marco_equipado, vitrina jsonb[3], created_at)
salas            (id, nombre, codigo, config jsonb, balance jsonb, created_at)
                  -- balance: valores de PL y umbrales de división de la sala;
                  -- null = usar los predeterminados (el botón de reseteo lo pone a null)
sala_miembros    (sala_id, usuario_id, rol: fundador|admin|miembro, joined_at)
temporadas       (id, sala_id, nombre, inicio, fin, estado)
liga             (temporada_id, usuario_id, pl, division_cache)
noches           (id, sala_id, temporada_id, inicio, fin_programado, fin_real,
                  estado: activa|cerrada, config jsonb)
noche_jugadores  (noche_id, usuario_id, joined_at, posicion_final, pl_ganados)
bebidas_tipo     (id, sala_id nullable, nombre, icono, puntos, ube, orden)
registros        (id, noche_id, usuario_id, bebida_tipo_id, ts, retroactivo bool,
                  anulado bool)
logros           (id, slug, nombre, desc, rareza, secreto bool, escalon,
                  repetible bool, tramo int nullable, icono, recompensa jsonb)
logros_usuario   (id, usuario_id, logro_id, noche_id nullable, ts)
                  -- una fila por medalla: los repetibles generan varias filas;
                  -- el contador "×N" es un COUNT por (usuario_id, logro_id)
cosmeticos       (id, tipo: marco|titulo|ropa|animacion|efecto, nombre, asset,
                  origen: logro|nivel|temporada|tienda, precio_chapas nullable)
cosmeticos_usuario (usuario_id, cosmetico_id, ts)
```

- Rankings = vistas/queries agregadas sobre `registros` + `noche_jugadores`.
- Motor de logros: función que corre al cerrar noche (los de noche/sociales) + triggers en `registros` (los de volumen en vivo — ver tu medalla saltar en directo mola más).

## 12. Roadmap

- **v0.1 — El núcleo**: auth, salas con código, iniciar/unirse/cerrar noche, botones de bebida, feed realtime, podio con animación. *(Ya es usable un sábado.)*
- **v0.2 — La chicha**: puntos de liga, divisiones, ranking de temporada, ~20 logros, perfil con stats.
- **v0.3 — El apego**: avatar por capas, estados de embriaguez, niveles/XP, vitrina, títulos, 60 logros, imagen compartible.
- **v0.4 — El lujo**: animaciones Rive, tienda de chapas, logros secretos, temporadas con recompensas exclusivas, push notifications.

---

*Nota de tono: la app es una coña entre amigos, no un promotor de atracones — el botón de agua, la medalla del Sobrio Designado y las UBE discretas mantienen el rollo sano sin sermonear.*
