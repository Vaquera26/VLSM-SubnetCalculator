import React, { useState } from 'react';
import './Calculator.css';

const Calculadora = () => {
  const [ip, setIp] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [subredes, setSubredes] = useState([{ id: 1, nombre: 'Subred A', hosts: '' }]);
  const [totalHosts, setTotalHosts] = useState(0);
  const [hostsDisponibles, setHostsDisponibles] = useState(0);
  const [claseIp, setClaseIp] = useState('');
  const [tablaSubredes, setTablaSubredes] = useState([]);
  const [pasosExplicacion, setPasosExplicacion] = useState([]);
  const [errorCalculo, setErrorCalculo] = useState('');

  const limitesHosts = {
    A: 16777214, // 2^24 - 2
    B: 65534, // 2^16 - 2
    C: 254 // 2^8 - 2
  };

  const validarIp = (ip) => {
    if (ip === '') {
      setMensaje('');
      return true;
    }

    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const match = ip.match(ipRegex);

    if (!match) {
      setMensaje('IP no válida');
      return false;
    }

    const [_, primerOcteto, segundoOcteto, tercerOcteto, cuartoOcteto] = match.map(Number);

    let claseIp = '';
    if (primerOcteto >= 1 && primerOcteto <= 126) {
      claseIp = 'A';
      if (segundoOcteto !== 0 || tercerOcteto !== 0 || cuartoOcteto !== 0) {
        setMensaje('Dirección IP de clase A, no válida, no es una dirección de red.');
        return false;
      }
    } else if (primerOcteto >= 128 && primerOcteto <= 191) {
      claseIp = 'B';
      if (tercerOcteto !== 0 || cuartoOcteto !== 0) {
        setMensaje('Dirección IP de clase B, no válida, no es una dirección de red.');
        return false;
      }
    } else if (primerOcteto >= 192 && primerOcteto <= 223) {
      claseIp = 'C';
      if (cuartoOcteto !== 0) {
        setMensaje('Dirección IP de clase C, no válida, no es una dirección de red.');
        return false;
      }
    } else {
      setMensaje('Clase de IP no soportada, no válida.');
      return false;
    }

    setClaseIp(claseIp);
    setHostsDisponibles(limitesHosts[claseIp]);
    setMensaje(`Dirección de red válida. Clase ${claseIp}`);
    return true;
  };

  const manejarCambioIp = (e) => {
    const input = e.target.value;
    setIp(input);
    validarIp(input);
  };

  const agregarSubred = () => {
    const nuevaSubredId = subredes.length + 1;
    const nuevaSubred = { id: nuevaSubredId, nombre: `Subred ${String.fromCharCode(65 + nuevaSubredId - 1)}`, hosts: '' };
    setSubredes([...subredes, nuevaSubred]);
  };

  const eliminarSubred = (id) => {
    const subredesFiltradas = subredes.filter(subred => subred.id !== id);
    const subredesActualizadas = subredesFiltradas.map((subred, index) => ({
      ...subred,
      id: index + 1,
      nombre: `Subred ${String.fromCharCode(65 + index)}`,
    }));
    recalcularHosts(subredesActualizadas);
    setSubredes(subredesActualizadas);
  };

  const manejarCambioHosts = (id, valor) => {
    const valorNumerico = parseInt(valor.replace(/^0+/, ''), 10) || '';
    const subredesActualizadas = subredes.map((subred) => 
      subred.id === id ? { ...subred, hosts: valorNumerico } : subred
    );
    recalcularHosts(subredesActualizadas);
    setSubredes(subredesActualizadas);
  };

  const recalcularHosts = (subredes) => {
    const total = subredes.reduce((acc, subred) => acc + (subred.hosts || 0), 0);
    setTotalHosts(total);
    setHostsDisponibles(limitesHosts[claseIp] - total);
  };

  const recalcularIp = (ip) => {
    for (let i = 3; i >= 0; i--) {
      if (ip[i] > 255) {
        ip[i - 1] += Math.floor(ip[i] / 256);
        ip[i] = ip[i] % 256;
      }
    }
    return ip;
  };

  const generarTablaSubredes = () => {
    setErrorCalculo('');
    
    if (!ip || !validarIp(ip)) {
      setErrorCalculo('Debe ingresar una dirección IP válida antes de calcular.');
      return;
    }

    if (subredes.some(subred => subred.hosts < 2)) {
      setErrorCalculo('Cada subred debe tener al menos 2 hosts.');
      return;
    }

    if (hostsDisponibles < 0) {
      setErrorCalculo('Se ha excedido el límite de hosts disponibles.');
      return;
    }

    const subredesOrdenadas = [...subredes].sort((a, b) => b.hosts - a.hosts);
    let ipInicio = ip.split('.').map(Number);

    const tabla = subredesOrdenadas.map(subred => {
      const bitsNecesarios = Math.ceil(Math.log2(subred.hosts + 2));
      const hostsUtiles = Math.pow(2, bitsNecesarios) - 2;
      const hostsDesperdiciados = hostsUtiles - subred.hosts;

      // Calcula la nueva máscara tomando en cuenta los octetos que ya no están disponibles
      const bitsPrestados = bitsNecesarios > 8 ? bitsNecesarios - 8 : bitsNecesarios;
      const nuevaMascara = (claseIp === 'A' ? 8 : claseIp === 'B' ? 16 : 24) + (8 - bitsPrestados);

      const ipFinal = [...ipInicio];
      ipFinal[3] += hostsUtiles;
      recalcularIp(ipFinal);

      const broadcast = [...ipFinal];
      broadcast[3] += 1;
      recalcularIp(broadcast);

      const ipInicioSubred = [...ipInicio];
      ipInicioSubred[3] += 1;
      recalcularIp(ipInicioSubred);

      const resultado = {
        subred: subred.nombre,
        direccionRed: ipInicio.join('.'),
        ipInicio: ipInicioSubred.join('.'),
        ipFinal: ipFinal.join('.'),
        broadcast: broadcast.join('.'),
        mascara: `/${nuevaMascara}`,
        mascaraDecimal: calcularMascaraDecimal(nuevaMascara),
        hostsUtiles,
        hostsDesperdiciados
      };

      ipInicio[3] = broadcast[3] + 1;
      recalcularIp(ipInicio);

      return resultado;
    });

    setTablaSubredes(tabla);
    generarExplicacionPasoAPaso(subredesOrdenadas, tabla);
  };

  const generarExplicacionPasoAPaso = (subredesOrdenadas, tablaSubredes) => {
    const pasos = [];

    // Paso 1: Ordenar las subredes según el número de hosts requeridos
    pasos.push({
      paso: "Paso 1: Ordenar las subredes según el número de hosts requeridos",
      descripcion: "Ordenamos las subredes de mayor a menor cantidad de hosts requeridos.",
      contenido: (
        <table className="tabla-resultados">
          <thead>
            <tr>
              <th>Subred</th>
              <th>Hosts Requeridos</th>
            </tr>
          </thead>
          <tbody>
            {subredesOrdenadas.map((subred) => (
              <tr key={subred.nombre}>
                <td>{subred.nombre}</td>
                <td>{subred.hosts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    });

    // Paso 2: Determinar el tamaño de las subredes
    pasos.push({
      paso: "Paso 2: Determinar el tamaño de las subredes",
      descripcion: "Determinamos el tamaño de cada subred utilizando la fórmula y = 2^n - 2, donde n es el número mínimo de bits necesarios para cubrir los hosts requeridos.",
      contenido: (
        <table className="tabla-resultados">
          <thead>
            <tr>
              <th>Subred</th>
              <th>Cálculo</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {subredesOrdenadas.map((subred) => {
              const bits = Math.ceil(Math.log2(subred.hosts + 2));
              const resultado = Math.pow(2, bits) - 2;
              return (
                <tr key={subred.nombre}>
                  <td>{subred.nombre}</td>
                  <td>{`2^${bits} - 2 = ${resultado}`}</td>
                  <td>{`${resultado} >= ${subred.hosts}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )
    });

    // Paso 3: Determinar la máscara de las subredes
    pasos.push({
      paso: "Paso 3: Determinar la máscara de las subredes",
      descripcion: "Determinamos la máscara de cada subred. El número de bits se toma del octeto correspondiente, restando los bits necesarios del total de 8.",
      contenido: (
        <table className="tabla-resultados">
          <thead>
            <tr>
              <th>Subred</th>
              <th>Cálculo</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {subredesOrdenadas.map((subred) => {
              const bits = Math.ceil(Math.log2(subred.hosts + 2));
              const bitsPrestados = bits > 8 ? bits - 8 : bits;
              const nuevaMascara = (claseIp === 'A' ? 8 : claseIp === 'B' ? 16 : 24) + (8 - bitsPrestados);
              return (
                <tr key={subred.nombre}>
                  <td>{subred.nombre}</td>
                  <td>{`${(claseIp === 'A' ? 8 : claseIp === 'B' ? 16 : 24)} + (8 - ${bitsPrestados}) = /${nuevaMascara}`}</td>
                  <td>{`/${nuevaMascara}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )
    });

    // Paso 4: Convertir la máscara a formato decimal
    pasos.push({
      paso: "Paso 4: Convertir la máscara a formato decimal",
      descripcion: "Convertimos la máscara utilizando los bits utilizados para la subred, sumando las potencias de 2 correspondientes.",
      contenido: (
        <table className="tabla-resultados">
          <thead>
            <tr>
              <th>Subred</th>
              <th>Máscara en bits</th>
              <th>Máscara Decimal</th>
            </tr>
          </thead>
          <tbody>
            {subredesOrdenadas.map((subred) => {
              const bits = Math.ceil(Math.log2(subred.hosts + 2));
              const bitsPrestados = bits > 8 ? bits - 8 : bits;
              const nuevaMascara = (claseIp === 'A' ? 8 : claseIp === 'B' ? 16 : 24) + (8 - bitsPrestados);
              return (
                <tr key={subred.nombre}>
                  <td>{subred.nombre}</td>
                  <td>{`/${nuevaMascara}`}</td>
                  <td>{calcularMascaraDecimal(nuevaMascara)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )
    });

    setPasosExplicacion(pasos);
  };

  const calcularMascaraDecimal = (mascara) => {
    let mascaraBinaria = '1'.repeat(mascara) + '0'.repeat(32 - mascara);
    let octetos = [];
    for (let i = 0; i < 4; i++) {
      octetos.push(parseInt(mascaraBinaria.slice(i * 8, (i + 1) * 8), 2));
    }
    return octetos.join('.');
  };

  return (
    <div className="contenedor-calculadora">
      <header className="barra-navegacion">
        <nav>
          <a href="/" className="enlace-nav">Inicio</a>
          <a href="/" className="enlace-nav">VLSM</a>
        </nav>
      </header>

      <h1 className="titulo">CALCULADORA</h1>
      <h2 className="titulo-vlsm">VLSM</h2>

      <div className="main-content">
        <div className="subred-section">
          <div className="seccion-entrada">
            <div className="contenedor-ip">
              <input 
                type="text" 
                className={`entrada-ip ${mensaje.includes('no válida') ? 'invalido' : ''}`} 
                placeholder="Dirección de Red" 
                value={ip} 
                onChange={manejarCambioIp} 
              />
              <button className="boton-calcular" onClick={generarTablaSubredes}>CALCULAR</button>
            </div>
            {mensaje && <p className={`mensaje-error ${!mensaje.includes('no válida') ? 'valido' : ''}`}>{mensaje}</p>}
          </div>

          <div className="seccion-subred">
            {subredes.map((subred) => (
              <div key={subred.id} className="fila-subred">
                <div className="subred-contenedor">
                  <label>{subred.nombre}</label>
                  <input 
                    type="number" 
                    className={`entrada-hosts ${subred.hosts < 2 && subred.hosts !== '' ? 'invalido' : ''}`} 
                    placeholder="Hosts" 
                    value={subred.hosts}
                    onChange={(e) => manejarCambioHosts(subred.id, e.target.value)} 
                  />
                  <button className="boton-eliminar-subred" onClick={() => eliminarSubred(subred.id)}>x</button>
                </div>
                {subred.hosts < 2 && subred.hosts !== '' && (
                  <p className="mensaje-error abajo">El mínimo de hosts es 2</p>
                )}
              </div>
            ))}

            <button 
              className="boton-agregar-subred" 
              onClick={agregarSubred}
              disabled={hostsDisponibles <= 0}
            >
              AGREGAR SUBRED
            </button>
          </div>

          <div className="total-hosts">
            <p>Total de Hosts:</p>
            <h3 className="numero-total-hosts">{totalHosts}</h3>
            <p className={`hosts-disponibles ${hostsDisponibles < 0 ? 'excedido' : hostsDisponibles < 50 ? 'casi-excedido' : ''}`}>
              Hosts Disponibles: {hostsDisponibles}
            </p>
            {hostsDisponibles < 0 && <p className="mensaje-error excedido">¡Se ha excedido el límite de hosts disponibles!</p>}
          </div>

          {errorCalculo && <p className="mensaje-error excedido">{errorCalculo}</p>}
        </div>

        <div className="tabla-section">
          <div className="tabla-subredes">
            <h2>Tabla de Subredes</h2>
            <table className="tabla-resultados">
              <thead>
                <tr>
                  <th>Subred</th>
                  <th>Dirección de Red</th>
                  <th>IP Inicio</th>
                  <th>IP Final</th>
                  <th>Broadcast</th>
                  <th>Máscara</th>
                  <th>Máscara Decimal</th>
                  <th>Hosts Útiles</th>
                  <th>Desperdiciados</th>
                </tr>
              </thead>
              <tbody>
                {tablaSubredes.map((subred, index) => (
                  <tr key={index}>
                    <td>{subred.subred}</td>
                    <td>{subred.direccionRed}</td>
                    <td>{subred.ipInicio}</td>
                    <td>{subred.ipFinal}</td>
                    <td>{subred.broadcast}</td>
                    <td>{subred.mascara}</td>
                    <td>{subred.mascaraDecimal}</td>
                    <td>{subred.hostsUtiles}</td>
                    <td>{subred.hostsDesperdiciados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="explicacion-pasos">
        <h2>Explicación Paso a Paso</h2>
        {pasosExplicacion.map((paso, index) => (
          <div key={index} className="paso-explicacion">
            <h3>{paso.paso}</h3>
            <div className="contenido-explicacion">
              <p>{paso.descripcion}</p>
              {paso.contenido}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calculadora;
