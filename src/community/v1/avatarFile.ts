/**
 * Turns a chosen photo into a small, square, circular-friendly avatar.
 *
 * The result is a compact JPEG data URL, so it travels with the profile itself:
 * it works on the site, keeps working in the offline folder without any extra
 * request, and never stores a huge original image.
 */
const MAX_CHARS = 380_000; // the server refuses anything larger

export const avatarFromFile = (file: File, size = 256): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not_an_image"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("no_canvas"));
        return;
      }
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
      let quality = 0.84;
      let out = canvas.toDataURL("image/jpeg", quality);
      while (out.length > MAX_CHARS && quality > 0.4) {
        quality -= 0.12;
        out = canvas.toDataURL("image/jpeg", quality);
      }
      if (out.length > MAX_CHARS && size > 128) {
        avatarFromFile(file, 160).then(resolve).catch(reject);
        return;
      }
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable_image"));
    };
    img.src = url;
  });
