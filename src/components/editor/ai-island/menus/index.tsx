import { MessagesType } from '../hooks/useGenMessages'
import ContinueMenu from './continue-menu'
import BrainStormMenu from './brain-storm-menu'
import OutlineMenu from './outline-menu'
import SummaryMenu from './summary-menu'
import MakeLongerMenu from './make-longer-menu'
import MakeShorterMenu from './make-shorter-menu'
// import FixSyntaxMenu from './fix-syntax-menu'
import ChangeToneMenu from './change-tone-menu'
import TranslateMenu from './translate-menu'
import ExplainMenu from './explain-menu'

interface IProps {
  onRequestAI: (message: MessagesType) => void
  setInstruction: (instruction: string) => void
}

export function MenusWhenSelectionIsEmpty(props: IProps) {
  const { onRequestAI, setInstruction } = props
  return (
    <div className="flex justify-center">
      <ContinueMenu onRequestAI={onRequestAI} setInstruction={setInstruction} />
      <BrainStormMenu onRequestAI={onRequestAI} setInstruction={setInstruction} />
      <OutlineMenu onRequestAI={onRequestAI} setInstruction={setInstruction} />
      <SummaryMenu onRequestAI={onRequestAI} setInstruction={setInstruction} />
    </div>
  )
}

export function MenusWhenSelectionIsNotEmpty(props: IProps) {
  const { onRequestAI, setInstruction } = props
  return (
    <div className="flex justify-center">
      <MakeLongerMenu onRequestAI={onRequestAI} setInstruction={setInstruction} />
      <MakeShorterMenu onRequestAI={onRequestAI} setInstruction={setInstruction} />
      <ChangeToneMenu onRequestAI={onRequestAI} setInstruction={setInstruction} />
      <TranslateMenu onRequestAI={onRequestAI} setInstruction={setInstruction} />
      <ExplainMenu onRequestAI={onRequestAI} setInstruction={setInstruction} />
      {/* <FixSyntaxMenu onRequestAI={onRequestAI} setInstruction={setInstruction} /> */}
    </div>
  )
}
