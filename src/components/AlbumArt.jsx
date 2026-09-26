export default function AlbumArt({ src, size = 40 }) {
  const style = { width: size, height: size }
  if (!src) return <div style={style} className="shrink-0 rounded-lg bg-art" />
  return <img src={src} alt="" style={style} className="shrink-0 rounded-lg object-cover" />
}
