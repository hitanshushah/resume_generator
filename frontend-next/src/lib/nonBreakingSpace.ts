import { Extension } from '@tiptap/core'

export const NonBreakingSpace = Extension.create({
  name: 'nonBreakingSpace',

  addKeyboardShortcuts() {
    return {
      
      Space: () => {
        this.editor.commands.insertContent('\u00A0')
        return true
      },

      
      Tab: () => {
        this.editor.commands.insertContent('\u00A0\u00A0\u00A0\u00A0')
        return true
      }
    }
  }
})

