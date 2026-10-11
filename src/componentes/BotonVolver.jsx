// Flecha para volver atrás sin guardar (FR-021).
export default function BotonVolver({ alVolver, deshabilitado = false }) {
  return (
    <button
      type="button"
      className="boton-volver"
      aria-label="Volver"
      onClick={alVolver}
      disabled={deshabilitado}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M15 5 8 12l7 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
