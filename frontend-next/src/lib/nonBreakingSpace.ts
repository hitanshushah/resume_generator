import { Extension } from '@tiptap/core'

export const NonBreakingSpace = Extension.create({
  name: 'nonBreakingSpace',

  addKeyboardShortcuts() {
    return {
      // When user presses Space → insert non-breaking space character (U+00A0)
      Space: () => {
        this.editor.commands.insertContent('\u00A0')
        return true
      },

      // When user presses Tab → insert 4 non-breaking spaces
      Tab: () => {
        this.editor.commands.insertContent('\u00A0\u00A0\u00A0\u00A0')
        return true
      }
    }
  }
})

