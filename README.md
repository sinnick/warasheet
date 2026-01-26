# WaraSheet

Bottom sheet component nativo para React Native con soporte para interacción de fondo (ideal para mapas).

## Características principales

- **Interacción de fondo**: Permite tocar elementos detrás del sheet (ej: mapas)
- **Detents flexibles**: Soporta alturas fijas (fracciones) o automáticas basadas en contenido
- **Gestos nativos**: Drag suave con efecto rubber band y snap a detents
- **Header/Footer fijos**: Áreas que no scrollean con el contenido
- **Integración con navegación**: Compatible con drawer navigation via `softDismiss`

---

## Instalación

Instalar:

```bash
npm install git+ssh://git@github.com:sinnick/warasheet.git
```

Importar:

```tsx
import { WaraSheet, type WaraSheetRef } from "@sinnick/warasheet";
```

---

## Uso básico

```tsx
import { useRef } from "react";
import { WaraSheet, type WaraSheetRef } from "@sinnick/warasheet";

function MyScreen() {
  const sheetRef = useRef<WaraSheetRef>(null);

  return (
    <View style={{ flex: 1 }}>
      <Button onPress={() => sheetRef.current?.present()}>
        Abrir Sheet
      </Button>

      <WaraSheet
        ref={sheetRef}
        detents={["auto"]}
        grabber={true}
      >
        <View style={{ padding: 16 }}>
          <Text>Contenido del sheet</Text>
        </View>
      </WaraSheet>
    </View>
  );
}
```

---

## Detents (Puntos de snap)

Los detents definen las alturas donde el sheet puede hacer "snap". Se especifican como un array.

### Tipos de detent

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `"auto"` | Altura basada en el contenido | `["auto"]` |
| `number` (0-1) | Fracción de la pantalla | `0.5` = 50% de la pantalla |

### Ejemplos

```tsx
// Sheet que se ajusta al contenido
<WaraSheet detents={["auto"]}>

// Sheet a media pantalla
<WaraSheet detents={[0.5]}>

// Sheet con múltiples posiciones (25%, 50%, 100%)
<WaraSheet detents={[0.25, 0.5, 1]}>

// Combinación: auto para contenido pequeño, full screen disponible
<WaraSheet detents={["auto", 1]}>
```

### Presentar en un detent específico

```tsx
// Presentar en el primer detent (índice 0)
sheetRef.current?.present(0);

// Presentar en el segundo detent (índice 1)
sheetRef.current?.present(1);

// Cambiar a otro detent mientras está abierto
sheetRef.current?.resize(2);
```

---

## Props

### Configuración principal

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `detents` | `("auto" \| number)[]` | `[0.5, 1]` | Puntos de snap del sheet |
| `initialDetentIndex` | `number` | `-1` | Índice inicial (-1 = cerrado) |
| `dismissible` | `boolean` | `true` | Permite dismiss arrastrando hacia abajo |
| `draggable` | `boolean` | `true` | Habilita gestos de drag |

### Interacción de fondo

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `allowBackgroundInteraction` | `boolean` | `true` | **CLAVE**: Permite tocar elementos detrás del sheet |
| `dimmed` | `boolean` | `true` | Oscurece el fondo |
| `dimmedDetentIndex` | `number` | `0` | Desde qué detent se oscurece |

### Apariencia

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `backgroundColor` | `ColorValue` | `"#fff"` | Color de fondo del sheet |
| `cornerRadius` | `number` | `20` | Radio de esquinas superiores |
| `grabber` | `boolean` | `true` | Mostrar handle de arrastre |
| `grabberOptions` | `GrabberOptions` | - | Personalizar el grabber |
| `style` | `StyleProp<ViewStyle>` | - | Estilos adicionales |

### Slots de contenido

| Prop | Tipo | Descripción |
|------|------|-------------|
| `header` | `ReactNode` | Contenido fijo en la parte superior |
| `footer` | `ReactNode` | Contenido fijo en la parte inferior (ideal para botones) |
| `children` | `ReactNode` | Contenido principal del sheet |

### Callbacks

| Prop | Tipo | Descripción |
|------|------|-------------|
| `onMount` | `() => void` | Cuando el componente monta |
| `onDidPresent` | `(info: DetentInfo) => void` | Después de presentar |
| `onDidDismiss` | `() => void` | Después de cerrar |
| `onDetentChange` | `(info: DetentInfo) => void` | Cuando cambia el detent |
| `onDragBegin` | `(info: DetentInfo) => void` | Al iniciar drag |
| `onDragEnd` | `(info: DetentInfo) => void` | Al terminar drag |

---

## Métodos del Ref

```tsx
const sheetRef = useRef<WaraSheetRef>(null);

// Presentar el sheet
sheetRef.current?.present();      // En el primer detent
sheetRef.current?.present(1);     // En el segundo detent

// Cerrar el sheet (dispara onDidDismiss)
sheetRef.current?.dismiss();

// Cerrar sin disparar onDidDismiss (para navegación)
sheetRef.current?.softDismiss();

// Cambiar de detent mientras está abierto
sheetRef.current?.resize(2);
```

### `dismiss()` vs `softDismiss()`

| Método | Dispara `onDidDismiss` | Uso |
|--------|------------------------|-----|
| `dismiss()` | ✅ Sí | Cuando el usuario cierra manualmente |
| `softDismiss()` | ❌ No | Navegación (drawer), para preservar estado del padre |

---

## Integración con Drawer Navigation

Para que el sheet se oculte al abrir el drawer y reaparezca al cerrarlo (sin perder el contenido), usar `useRegisterSheet`:

```tsx
import { useRegisterSheet } from "@/core/hooks/useRegisterSheet";

function MapScreen() {
  // Registra el sheet para manejo automático con el drawer
  const sheetRef = useRegisterSheet("map-unit-details");

  return (
    <WaraSheet ref={sheetRef} ...>
      {/* El contenido se preserva al abrir/cerrar el drawer */}
    </WaraSheet>
  );
}
```

---

## Ejemplos de uso

### 1. Sheet para mapa (interacción de fondo)

```tsx
<WaraSheet
  ref={sheetRef}
  detents={["auto"]}
  dimmed={false}
  allowBackgroundInteraction={true}
  onDidDismiss={() => setSelectedUnit(null)}
>
  <UnitDetails unit={selectedUnit} />
</WaraSheet>
```

### 2. Sheet con formulario y botones en footer

```tsx
<WaraSheet
  ref={sheetRef}
  detents={["auto"]}
  footer={
    <View style={styles.footer}>
      <Button onPress={handleCancel}>Cancelar</Button>
      <Button onPress={handleSubmit}>Confirmar</Button>
    </View>
  }
>
  <View style={styles.form}>
    <TextInput placeholder="Nombre" />
    <TextInput placeholder="Email" />
  </View>
</WaraSheet>
```

### 3. Sheet con múltiples detents

```tsx
<WaraSheet
  ref={sheetRef}
  detents={[0.25, 0.5, 1]}
  initialDetentIndex={0}
>
  <View>
    {/* Contenido que el usuario puede expandir */}
  </View>
</WaraSheet>
```

### 4. Sheet modal (bloquea fondo)

```tsx
<WaraSheet
  ref={sheetRef}
  detents={[0.5]}
  dimmed={true}
  allowBackgroundInteraction={false}
  dismissible={false}
>
  <ConfirmationDialog />
</WaraSheet>
```

---

## Personalización del Grabber

```tsx
<WaraSheet
  grabber={true}
  grabberOptions={{
    visible: true,
    color: "#CCCCCC",
    width: 40,
    height: 5,
  }}
>
```

---

## Exports disponibles

```tsx
// Componente principal
import { WaraSheet } from "@sinnick/warasheet";

// Types
import type {
  WaraSheetRef,
  WaraSheetProps,
  SheetDetent,
  DetentInfo,
  GrabberOptions,
} from "@sinnick/warasheet";

// Context (para control global)
import { WaraSheetProvider, useWaraSheet } from "@sinnick/warasheet";

// Sub-componentes (uso avanzado)
import { SheetGrabber, SheetBackdrop } from "@sinnick/warasheet";

// Hooks
import { useContentHeight } from "@sinnick/warasheet";
```

---

## Diferencias con TrueSheet

| Feature | WaraSheet | TrueSheet |
|---------|-----------|-----------|
| Interacción de fondo | ✅ Soportado | ❌ Modal nativo bloquea |
| Implementación | JS/Reanimated | Nativo (iOS UISheet) |
| Detents | `"auto"` o fracciones | Similar |
| `softDismiss` | ✅ Soportado | ❌ No disponible |
| Ideal para | Mapas, overlays | Modales tradicionales |

---

## Contenido Scrolleable

WaraSheet soporta contenido scrolleable (FlatList, ScrollView) dentro del sheet. El área de contenido calcula su altura dinámicamente basada en la posición actual del sheet.

### Usar FlatList dentro del sheet

```tsx
<WaraSheet
  ref={sheetRef}
  detents={[0.4, 0.7]}
  header={<MyHeader />}
>
  <FlatList
    data={items}
    renderItem={renderItem}
    style={{ flex: 1 }}
    contentContainerStyle={{
      paddingBottom: insets.bottom + 100, // Padding extra para ver últimos items
    }}
  />
</WaraSheet>
```

### Notas importantes

- **Usar `FlatList` en lugar de `FlashList`**: FlashList tiene bugs conocidos con gesture handlers. FlatList es más estable.
- **Agregar `style={{ flex: 1 }}`** a la lista para que ocupe todo el espacio disponible.
- **Padding inferior**: Agregar suficiente `paddingBottom` en `contentContainerStyle` para que los últimos items sean visibles.
- **El header es draggable**: El área del grabber y header responde a gestos de drag. El contenido (children) permite scroll sin mover el sheet.

---

## Troubleshooting

### El sheet crashea al arrastrar
Asegurarse de que la versión de `react-native-reanimated` es compatible y que el plugin de Babel está configurado.

### El contenido no se ve
Verificar que `children` tiene estilos con altura o contenido visible.

### Los botones se superponen con el contenido
Usar el prop `footer` para botones de acción en lugar de incluirlos en `children`.

### El estado se pierde al abrir el drawer
Usar `useRegisterSheet` para que el sheet use `softDismiss` automáticamente.

### El scroll no funciona dentro del sheet
- Usar `FlatList` de React Native (no `FlashList`)
- Agregar `style={{ flex: 1 }}` a la lista
- Verificar que hay suficiente `paddingBottom` en `contentContainerStyle`
