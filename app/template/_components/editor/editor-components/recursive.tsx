import { EditorElement } from '@/providers/editor/editor-provider'
import AudioComponent from './audio'
import Checkbox from './checkbox'
import Container from './container'
import DynamicAudioComponent from './dynamic-audio'
import DynamicCheckbox from './dynamic-checkbox'
import DynamicImageComponent from './dynamic-image'
import DynamicTextComponent from './dynamic-text'
import DynamicVideoComponent from './dynamic-video'
import ImageComponent from './image'
import InputRecordAudioComponent from './input-recordAudio'
import InputRecordVideoComponent from './input-recordVideo'
import InputText from './InputText'
import LinkComponent from './link-component'
import RecordAudioComponent from './recordAudio'
import RecordVideoComponent from './recordVideo'
import TextComponent from './text'
import VideoComponent from './video'

type Props = {
  element: EditorElement
}

const Recursive = ({ element }: Props) => {
  switch (element.type) {
    case 'text':
      return <TextComponent element={element} />
    case 'container':
      return <Container element={element} />
    case 'video':
      return <VideoComponent element={element} />
    case '2Col':
      return <Container element={element} />
    case '__body':
      return <Container element={element} />
    case 'dynamicText':
      return <DynamicTextComponent element={element} />
    case 'dynamicVideo':
      return <DynamicVideoComponent element={element} />
    case 'dynamicImage':
      return <DynamicImageComponent element={element} />
    case 'image':
      return <ImageComponent element={element} />
    case 'dynamicAudio':
      return <DynamicAudioComponent element={element} />
    case 'audio':
      return <AudioComponent element={element} />
    case 'inputText':
      return <InputText element={element} />
    case 'link':
      return <LinkComponent element={element} />
    case 'checkbox':
      return <Checkbox element={element} />
    case 'dynamicCheckbox':
      return <DynamicCheckbox element={element} />
    case 'recordAudio':
      return <RecordAudioComponent element={element} />
    case 'recordVideo':
      return <RecordVideoComponent element={element} />
    case 'inputRecordAudio':
      return <InputRecordAudioComponent element={element} />
    case 'inputRecordVideo':
      return <InputRecordVideoComponent element={element} />
    default:
      return null
  }
}

export default Recursive
