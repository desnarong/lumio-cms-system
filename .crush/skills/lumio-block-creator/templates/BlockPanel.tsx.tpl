import { ImagePicker, TextField, Select, Slider } from "@lumio/ui";

export function __NAME__Panel({ props, style, onChange, mode }: PanelProps) {
  return (
    <>
      <PanelSection title="เนื้อหา">
        <TextField label="หัวข้อ" value={props.heading} onChange={(v) => onChange("props.heading", v)} />
        <TextField label="คำอธิบาย" value={props.subheading} onChange={(v) => onChange("props.subheading", v)} />
        <ImagePicker label="รูปภาพ" value={props.image} onChange={(v) => onChange("props.image", v)} requireAlt />
      </PanelSection>

      <PanelSection title="หน้าตา">
        <Select label="ระยะห่าง" value={style.paddingY} options={["sm", "md", "lg", "xl"]} onChange={(v) => onChange("style.paddingY", v)} />
      </PanelSection>

      {mode !== "simple" && (
        <PanelSection title="ขั้นสูง">
          <Slider label="Animation" value={style.animation} onChange={(v) => onChange("style.animation", v)} />
        </PanelSection>
      )}
    </>
  );
}
