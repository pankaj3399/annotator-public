'use client'

import { EditorElement } from '@/providers/editor/editor-provider'
import { lazy } from 'react'

// Static imports for frequently used components
import Container from './container'
import TextComponent from './text'
import VideoComponent from './video'
import DynamicImageAnnotation from './imageAnnotation'

// Lazy imports for other components to improve initial load time
const AudioComponent = lazy(() => import('./audio'))
const Checkbox = lazy(() => import('./checkbox'))
const DynamicAudioComponent = lazy(() => import('./dynamic-audio'))
const DynamicCheckbox = lazy(() => import('./dynamic-checkbox'))
const DynamicImageComponent = lazy(() => import('./dynamic-image'))
const DynamicTextComponent = lazy(() => import('./dynamic-text'))
const DynamicVideoComponent = lazy(() => import('./dynamic-video'))
const DynamicUploadComponent = lazy(() => import('./dynamic-upload'))
const DynamicCarouselComponent = lazy(() => import('./dynamic-carousal'))
const ImageComponent = lazy(() => import('./image'))
const InputRecordAudioComponent = lazy(() => import('./input-recordAudio'))
const InputRecordVideoComponent = lazy(() => import('./input-recordVideo'))
const InputText = lazy(() => import('./InputText'))
const LinkComponent = lazy(() => import('./link-component'))
const RecordAudioComponent = lazy(() => import('./recordAudio'))
const RecordVideoComponent = lazy(() => import('./recordVideo'))
const UploadComponent = lazy(()=>import('./upload'))
const UploadInputComponent = lazy(()=>import('./upload-input'))

type Props = {
  element: EditorElement
}

// Component map for cleaner switch statement
const COMPONENT_MAP = {
  text: TextComponent,
  container: Container,
  video: VideoComponent,
  '2Col': Container,
  '__body': Container,
  dynamicText: DynamicTextComponent,
  dynamicVideo: DynamicVideoComponent,
  dynamicImage: DynamicImageComponent,
  dynamicCarousel: DynamicCarouselComponent,
  image: ImageComponent,
  dynamicAudio: DynamicAudioComponent,
  audio: AudioComponent,
  inputText: InputText,
  link: LinkComponent,
  checkbox: Checkbox,
  dynamicCheckbox: DynamicCheckbox,
  recordAudio: RecordAudioComponent,
  recordVideo: RecordVideoComponent,
  inputRecordAudio: InputRecordAudioComponent,
  inputRecordVideo: InputRecordVideoComponent,
  dynamicUpload: DynamicUploadComponent, 
  Upload:UploadComponent,
  UploadInput:UploadInputComponent,
  dynamicImageAnnotation: DynamicImageAnnotation,
} as const

const Recursive = ({ element }: Props) => {
  const Component = COMPONENT_MAP[element.type as keyof typeof COMPONENT_MAP]
  
  if (!Component) {
    return null
  }

  return <Component element={element} />
}

// Type check for the component map
type ComponentMapCheck = {
  [K in keyof typeof COMPONENT_MAP]: React.ComponentType<Props>
}
type Check = typeof COMPONENT_MAP extends ComponentMapCheck ? true : false
const typeCheck: Check = true

export default Recursive