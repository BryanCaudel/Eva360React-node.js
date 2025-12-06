import { useState } from "react";

export default function useSession() {
  const [sesionId, setSesionId] = useState(null);
  const [token, setToken] = useState(null);
  const [encuestaId, setEncuestaId] = useState(null);
  const [equipoId, setEquipoId] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [evaluadoNombre, setEvaluadoNombre] = useState(null);

  function clear() {
    setSesionId(null);
    setToken(null);
    setEncuestaId(null);
    setEquipoId(null);
    setPreguntas([]);
    setEvaluadoNombre(null);
  }

  return {
    sesionId, setSesionId,
    token, setToken,
    encuestaId, setEncuestaId,
    equipoId, setEquipoId,
    preguntas, setPreguntas,
    evaluadoNombre, setEvaluadoNombre,
    clear,
  };
}
