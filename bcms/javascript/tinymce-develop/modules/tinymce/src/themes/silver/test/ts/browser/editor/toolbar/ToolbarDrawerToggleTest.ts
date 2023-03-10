import { TestStore, Waiter } from '@ephox/agar';
import { context, describe, it } from '@ephox/bedrock-client';
import { Arr } from '@ephox/katamari';
import { McEditor, TinyUiActions } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'tinymce/core/api/Editor';
import { RawEditorOptions, ToolbarMode } from 'tinymce/core/api/OptionTypes';

import * as UiUtils from '../../../module/UiUtils';

describe('browser.tinymce.themes.silver.editor.toolbar.ToolbarDrawerToggleTest', () => {

  const assertToolbarToggleState = (editor: Editor, expected: boolean) => {
    const state = editor.queryCommandState('ToggleToolbarDrawer');
    assert.equal(state, expected, 'Expected toolbar toggle state to be ' + expected);
  };

  const pTestToggle = async (options: RawEditorOptions, shouldToggle: boolean) => {
    const editor = await McEditor.pFromSettings<Editor>({
      toolbar: 'undo redo | bold italic',
      menubar: false,
      statusbar: false,
      width: 200,
      ...options,
      base_url: '/project/tinymce/js/tinymce'
    });
    editor.focus();
    await UiUtils.pWaitForEditorToRender();
    assertToolbarToggleState(editor, false);
    editor.execCommand('ToggleToolbarDrawer');
    assertToolbarToggleState(editor, shouldToggle);
    editor.execCommand('ToggleToolbarDrawer');
    assertToolbarToggleState(editor, false);
    McEditor.remove(editor);
  };

  context(`Using the 'ToggleToolbarDrawer' command should toggle the toolbar if applicable`, () => {
    Arr.each<{ mode: ToolbarMode; shouldToggle: boolean }>([
      { mode: 'floating', shouldToggle: true },
      { mode: 'sliding', shouldToggle: true },
      { mode: 'wrap', shouldToggle: false },
      { mode: 'scrolling', shouldToggle: false }
    ], (test) => {
      // Test iframe
      it(`TINY-6032: ${test.mode} toolbar`, () =>
        pTestToggle({ toolbar_mode: test.mode }, false)
      );

      it(`TINY-6032: ${test.mode} toolbar - small width`, () =>
        pTestToggle({ toolbar_mode: test.mode, width: 50 }, test.shouldToggle)
      );

      // Test inline
      it(`TINY-6032: ${test.mode} toolbar (inline)`, () =>
        pTestToggle({ toolbar_mode: test.mode, inline: true }, false)
      );

      it(`TINY-6032: ${test.mode} toolbar - small width (inline)`, () =>
        pTestToggle({ toolbar_mode: test.mode, width: 50, inline: true }, test.shouldToggle)
      );
    });

    it('TINY-6032: Multiple toolbars', () =>
      pTestToggle({ toolbar: [ 'undo redo', 'bold italic' ] }, false)
    );

    it('TINY-6032: Multiple toolbars (inline)', () =>
      pTestToggle({ toolbar: [ 'undo redo', 'bold italic' ], inline: true }, false)
    );
  });

  const pTestEvent = async (toolbarMode: ToolbarMode, command: (editor: Editor) => void) => {
    const editor = await McEditor.pFromSettings<Editor>({
      menubar: false,
      statusbar: false,
      width: 200,
      toolbar_mode: toolbarMode,
      base_url: '/project/tinymce/js/tinymce'
    });
    editor.focus();

    const store = TestStore<boolean>();
    await UiUtils.pWaitForEditorToRender();

    editor.on('ToggleToolbarDrawer', (options: { state: boolean }) => {
      store.add(options.state);
    });

    command(editor);
    await TinyUiActions.pWaitForUi(editor, '.tox-toolbar__overflow');
    command(editor);
    await Waiter.pTryUntil('Wait for toolbar to be completely open', () => {
      store.sAssertEq('Assert store contains opened state', [ true, false ]);
    });
    McEditor.remove(editor);
  };

  context(`Should emit 'ToogleToolbarDrawer' event when toggled`, () => {
    Arr.each<ToolbarMode>([ 'floating', 'sliding' ], (toolbarMode) => {
      it(`TINY-9271: Emits 'ToggleToolbarDrawer' in ${toolbarMode} via execCommand`, async () => {
        await pTestEvent(toolbarMode, (editor) => editor.execCommand('ToggleToolbarDrawer'));
      });

      it(`TINY-9271: Emits 'ToggleToolbarDrawer' in ${toolbarMode} via user click`, async () => {
        await pTestEvent(toolbarMode, (editor) => TinyUiActions.clickOnToolbar(editor, 'button[title="More..."]'));
      });
    });
  });
});
