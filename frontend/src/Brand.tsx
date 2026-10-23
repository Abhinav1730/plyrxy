import { WaveSineIcon } from "@phosphor-icons/react/dist/csr/WaveSine";

export default function Brand() {
  return (
    <a className="brand" href="/" aria-label="Wind Intelligence home">
      <WaveSineIcon size={43} weight="regular" aria-hidden="true" />
      <span>Wind Intelligence</span>
    </a>
  );
}
