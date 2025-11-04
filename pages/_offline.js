import Head from 'next/head';

export default function OfflinePage() {
  return (
    <div className="container py-5">
      <Head>
        <title>Sin conexión – eiMai</title>
      </Head>
      <div className="text-center">
        <h1 className="mb-3">Estás sin conexión</h1>
        <p className="text-muted mb-4">
          Algunas funciones pueden no estar disponibles. Intenta de nuevo cuando
          recuperes la conexión.
        </p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
