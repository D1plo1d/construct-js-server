import { useState, useEffect } from 'react'
import { useMutation } from 'react-apollo-hooks'
import { EXEC_GCODES } from './useExecGCodes'

const useContinuousMove = ({ machine }) => {
  const [execGCodes] = useMutation(EXEC_GCODES)

  const [state, setState] = useState({
    axes: null,
    startedAt: null,
    stoppedAt: null,
    mutationLastCompletedAt: null,
  })

  const start = axes => () => {
    setState(prevState => ({
      ...prevState,
      axes,
      startedAt: Date.now(),
    }))
  }

  const stop = () => {
    setState(prevState => ({
      ...prevState,
      stoppedAt: Date.now(),
    }))
  }

  // Stop the machines movement on mouse up regardless of where the mouse is
  useEffect(() => {
    document.addEventListener('mouseup', stop, true)
    document.addEventListener('touchend', stop, true)

    return () => {
      document.removeEventListener('mouseup', stop, true)
      document.removeEventListener('touchend', stop, true)
    }
  }, [])

  const tickMovement = async () => {
    const { error } = await execGCodes({
      variables: {
        input: {
          machineID: machine.id,
          gcodes: [
            { continuousMove: { ms: 200, axes: state.axes, feedrateMultiplier: 0.5 } },
          ],
        },
      },
    })

    if (error != null) {
      throw new Error(error)
    }
    // console.log((Date.now() - state.mutationLastCompletedAt) / 1000)

    setState(prevState => ({
      ...prevState,
      mutationLastCompletedAt: Date.now(),
    }))
  }

  useEffect(() => {
    if (state.startedAt != null && state.startedAt > state.stoppedAt) {
      tickMovement()
    }
  }, [state.startedAt, state.mutationLastCompletedAt])

  return { start }
}


export default useContinuousMove