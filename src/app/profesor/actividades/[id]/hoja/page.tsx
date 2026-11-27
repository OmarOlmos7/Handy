import { ConFlujo } from "@/components/flujo-actividad";
import { notFound } from "next/navigation";
import { ResumenAlta } from "@/components/resumen-alta";
import { BotonImprimir } from "@/components/boton-imprimir";
import { EditarHoja } from "@/components/editar-hoja";
import { Hoja } from "@/components/hoja";
import { HojaActividad } from "@/components/hoja-actividad";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { actividadDe, grupoDe } from "@/lib/almacen";
import { srcLogo } from "@/lib/logo";
import { datosProfesor } from "@/lib/sesion";
import { qrDataUrl, urlBase } from "@/lib/qr";
import { versionesCompletas } from "@/lib/versiones";
import { textos, textosDeActividad } from "@/lib/i18n/servidor";
import { ProveedorTextos } from "@/components/proveedor-textos";
import { ResponderActividad } from "@/components/responder-actividad";
import { esPlataforma, reactivosParaAlumno } from "@/lib/plataforma";
import { formato } from "@/lib/i18n/idiomas";
import { MaterialContenido } from "@/components/material-contenido";
import { FichaInstrucciones } from "@/components/ficha-instrucciones";

/** Enlace de la página de entrega, al pie de la ficha, para compartirlo con los alumnos. */
function Enlace({ enlace, titulo }: { enlace: string; titulo: string }) {
  return (
    <div className="min-w-0 text-sm">
      <p className="font-semibold text-slate-800">{titulo}</p>
      <a href={enlace} target="_blank" className="mt-1 block break-all font-medium text-tinta-700 hover:underline">
        {enlace}
      </a>
    </div>
  );
}

export default async function HojaImprimible({ params }: PageProps<"/profesor/actividades/[id]/hoja">) {
  const { id } = await params;
  const { db, profesor } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const { t } = await textos();
  const impreso = await textosDeActividad(actividad);
  const th = t.profesor.hoja;
  const curso = `${grupo.materia} · ${grupo.nombre}`;
  const base = await urlBase();
  const qr = await qrDataUrl(`${base}/entregar/${id}`);
  // Con varias versiones, cada hoja lleva su letra y su propio QR (la entrega queda con su versión).
  const versiones = actividad.versiones?.length
    ? await Promise.all(versionesCompletas(actividad).map(async (v) => ({ ...v, qr: await qrDataUrl(`${base}/entregar/${id}?v=${v.letra}`) })))
    : undefined;
  const siguiente = actividad.sinSolucion ? (
    <BotonLink href={`/profesor/actividades/${id}/rubrica`} variante="secundario">
      {th.irRubrica}
    </BotonLink>
  ) : actividad.reactivos.some((r) => r.respuesta.trim()) ? null : (
    <BotonLink href={`/profesor/actividades/${id}/solucion`} variante="secundario">
      {th.siguiente}
    </BotonLink>
  );
  const logo = srcLogo(profesor.config);
  const resumen = <ResumenAlta actividad={actividad} grupo={grupo} />;
  const migas = [
    { texto: t.profesor.comun.panel, href: "/profesor" },
    { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
    { texto: actividad.titulo, href: `/profesor/actividades/${id}` },
  ];

  // Actividad de contenido: el profesor ve el material y las instrucciones como los verá el alumno.
  if (actividad.contenido) {
    const enlace = `${base}/entregar/${id}`;
    const tc = t.contenido;
    return (
      <>
        <Encabezado migas={migas} titulo={tc.hojaTitulo} subtitulo={tc.hojaTexto} acciones={siguiente} />
        <ConFlujo vista={1} db={db} actividad={actividad}>
          <div className="mx-auto max-w-3xl space-y-6">
            {resumen}
            <FichaInstrucciones actividad={actividad} curso={curso} t={impreso.t} locale={impreso.locale} logo={logo} qrSrc={qr}>
              <Enlace enlace={enlace} titulo={th.enlaceAlumnos} />
            </FichaInstrucciones>
            <ProveedorTextos valor={impreso}>
              <section className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:p-6">
                <MaterialContenido instrucciones={[]} anexos={actividad.contenido.anexos} entrega={actividad.contenido.entrega} />
                {esPlataforma(actividad) && (
                  <ResponderActividad actividadId={id} reactivos={reactivosParaAlumno(actividad)} vistaPrevia evidenciaDigital />
                )}
              </section>
            </ProveedorTextos>
          </div>
        </ConFlujo>
      </>
    );
  }

  // En plataforma no hay hoja impresa: el profesor ve la actividad como la contestará el alumno.
  if (esPlataforma(actividad)) {
    const enlace = `${base}/entregar/${id}`;
    const lista = versionesCompletas(actividad);
    return (
      <>
        <Encabezado migas={migas} titulo={th.plataformaTitulo} subtitulo={th.plataformaTexto} acciones={siguiente} />
        <ConFlujo vista={1} db={db} actividad={actividad}>
          <div className="mx-auto max-w-2xl space-y-6">
            {resumen}
            <EditarHoja
              actividadId={id}
              puedeDeshacer={!!actividad.hojaAnterior}
              bloqueada={db.entregas.some((e) => e.actividadId === id && e.estado !== "sin_entregar")}
            />
            <FichaInstrucciones actividad={actividad} curso={curso} t={impreso.t} locale={impreso.locale} logo={logo} qrSrc={qr}>
              <Enlace enlace={enlace} titulo={th.enlaceAlumnos} />
              {lista.length > 1 && <p className="mt-2 text-xs text-slate-500">{th.plataformaVersiones}</p>}
            </FichaInstrucciones>
            <ProveedorTextos valor={impreso}>
              {lista.map((v) => (
                <section key={v.letra} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:p-6">
                  {lista.length > 1 && <h2 className="mb-3 text-sm font-semibold text-slate-500">{formato(th.versionN, { v: v.letra })}</h2>}
                  <ResponderActividad actividadId={id} reactivos={reactivosParaAlumno(v.actividad)} vistaPrevia />
                </section>
              ))}
            </ProveedorTextos>
          </div>
        </ConFlujo>
      </>
    );
  }

  if (actividad.origen === "escaneada") {
    return (
      <>
        <Encabezado
          migas={migas}
          titulo={th.titulo}
          subtitulo={th.escaneadaTexto}
          acciones={
            <>
              <BotonLink href={`/api/hoja/${id}`} target="_blank">
                {th.descargar}
              </BotonLink>
              {siguiente}
            </>
          }
        />
        <ConFlujo vista={1} db={db} actividad={actividad}>
          {resumen}
          <Tarjeta className="mx-auto max-w-3xl p-2">
            <iframe src={`/api/hoja/${id}`} title={th.titulo} className="h-[80vh] w-full rounded-lg" />
          </Tarjeta>
        </ConFlujo>
      </>
    );
  }

  return (
    <>
      <div className="no-imprimir">
      <Encabezado
        migas={migas}
        titulo={th.titulo}
        subtitulo={th.texto}
        acciones={
          <>
            <BotonImprimir texto={th.imprimir} />
            {siguiente}
          </>
        }
      />
      </div>
      <ConFlujo vista={1} db={db} actividad={actividad}>
      {resumen}
      <ProveedorTextos valor={impreso}>
      {actividad.origen === "ia" ? (
        <>
          <EditarHoja
            actividadId={id}
            puedeDeshacer={!!actividad.hojaAnterior}
            bloqueada={db.entregas.some((e) => e.actividadId === id && e.estado !== "sin_entregar")}
          />
          {versiones ? (
            <>
              <p className="no-imprimir mx-auto mb-4 max-w-[8.5in] rounded-lg bg-tinta-50 px-4 py-3 text-sm text-tinta-700">{th.versionesTexto}</p>
              {versiones.map((v, i) => (
                <div key={v.letra} className={i > 0 ? "mt-8 break-before-page" : ""}>
                  <HojaActividad logo={srcLogo(profesor.config)} actividad={v.actividad} curso={curso} qrSrc={v.qr} version={v.letra} />
                </div>
              ))}
            </>
          ) : (
            <HojaActividad logo={srcLogo(profesor.config)} actividad={actividad} curso={curso} qrSrc={qr} />
          )}
        </>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          {Array.from({ length: actividad.paginas }, (_, i) => (
            <div key={i} className="break-after-page">
              <Hoja actividad={actividad} pagina={i + 1} modo="en_blanco" qrSrc={qr} grupoTexto={curso} />
            </div>
          ))}
        </div>
      )}
      </ProveedorTextos>
      </ConFlujo>
    </>
  );
}
