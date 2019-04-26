import ReactDOM from 'react-dom'

import * as Three from 'three'

import readFile from '../../../common/readFile'

import './GCodeLoader'
import './OrbitControls'

const renderGCode = (files, containerRef, setLoading) => {
  // eslint-disable-next-line react/no-find-dom-node
  const containerElement = ReactDOM.findDOMNode(containerRef.current)

  const getSize = () => {
    const width = containerElement.offsetWidth
    const height = containerElement.offsetHeight
    return {
      width,
      height,
      aspect: width / height,
    }
  }

  const initialSize = getSize()
  const camera = new Three.PerspectiveCamera(90, initialSize.aspect, 0.1, 10000)

  // eslint-disable-next-line no-new
  const controls = new Three.OrbitControls(camera)
  camera.position.set(0, 0, 200)
  controls.update()

  // const controls = new OrbitControls(camera)
  const scene = new Three.Scene()

  const renderer = new Three.WebGLRenderer()
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(initialSize.width, initialSize.height)

  const resize = () => {
    const { aspect, width, height } = getSize()
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  window.addEventListener('resize', resize, false)

  let continueAnimation = true

  const animate = () => {
    if (!continueAnimation) return

    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }

  const asyncSetup = async () => {
    const gcodeText = await readFile(files[0])
    const gcodeObject = new Three.GCodeLoader().parse(gcodeText)
    gcodeObject.position.set(-100, -20, 100)
    scene.add(gcodeObject)

    containerElement.appendChild(renderer.domElement)

    animate()
    setLoading(false)
  }

  asyncSetup()

  const cleanup = () => {
    continueAnimation = false
    renderer.dispose()
    scene.dispose()
    controls.dispose()
  }

  return cleanup
}

export default renderGCode
