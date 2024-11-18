// ... otros imports ...
import { ImageUpload } from "@/components/admin/ImageUpload";

export function ProductForm() {
  const [images, setImages] = useState<string[]>([]);

  return (
    <form>
      {/* ... otros campos ... */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Imágenes del producto</label>
        <ImageUpload
          value={images}
          onChange={setImages}
          maxImages={4}
        />
      </div>
      {/* ... resto del formulario ... */}
    </form>
  );
}