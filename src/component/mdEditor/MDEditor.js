import React, { useState, useEffect } from 'react';
import { UnControlled as CodeMirror } from 'react-codemirror2';
import MdHeader from './MdHeader';
import MDPriview from '../mdPriview/index';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/lib/codemirror.js';
import 'codemirror/lib/codemirror.css';
import '../../assets/EditorTheme/mdn-like.css';
import '../../assets/EditorTheme/ambiance.css';
import './index.less';

let scrolling = 0;
let scrollTimer;

const EDIT_MODE = {
    0: {
        left_width: '100%',
        right_width: 0
    },
    1: {
        left_width: 0,
        right_width: '100%'
    },
    2: {
        left_width: '50%',
        right_width: '50%'
    }
};

function MdEditor(props) {
    const { imageUploadConf } = props;
    const [value, setValue] = useState('');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [editor, setEditor] = useState();
    const [editMode, setEditMode] = useState(2);
    const [theme, setTheme] = useState({
        contentTheme: 'awesome-green',
        editTheme: 'mdn-like',
        fontSize: 16,
        codeHig: 'a11yDark'
    });

    const setThemeConf = confMap => {
        let newTheme = { ...theme, ...confMap };
        setTheme(newTheme);
    };

    const beforeInsert = matchStr => {
        let insertText = matchStr;
        const cm = editor;
        if (cm?.somethingSelected()) {
            const selectContent = cm.getSelection();
            insertText = matchStr + selectContent;
        }
        cm.replaceSelection(insertText);
        cm.focus();
    };

    const middleInsert = matchStr => {
        let insertText = matchStr;
        insertText = matchStr.replace('{$}', '');
        const cm = editor;
        if (cm.somethingSelected()) {
            const selectContent = cm.getSelection();
            insertText = matchStr.replace('{$}', selectContent);
        }
        cm.replaceSelection(insertText);
        const pos = cm.getCursor();
        cm.setCursor({ line: pos.line, ch: pos.ch - (matchStr.length - 3) / 2 });
        cm.focus();
    };

    const listInsert = matchStr => {
        // ???????????????????????????, matchStr???????????????
        const cm = editor;
        if (cm.somethingSelected()) {
            const selectContent = cm.listSelections()[0]; // ????????????????????????
            let { anchor, head } = selectContent;
            head.line >= anchor.line && head.sticky === 'before' && ([head, anchor] = [anchor, head]);
            let preLine = head.line;
            let aftLine = anchor.line;
            if (preLine !== aftLine) {
                // ????????????????????????????????????????????????
                let pos = matchStr.length;
                for (let i = preLine; i <= aftLine; i++) {
                    cm.setCursor({ line: i, ch: 0 });
                    cm.replaceSelection(matchStr);
                    i === aftLine && (pos += cm.getLine(i).length);
                }
                cm.setCursor({ line: aftLine, ch: pos });
                cm.focus();
            } else {
                // ????????????????????????????????????????????????????????????
                const preStr = cm.getRange({ line: preLine, ch: 0 }, head);
                if (preStr === matchStr) {
                    cm.replaceRange('', { line: preLine, ch: 0 }, head);
                } else {
                    const selectVal = cm.getSelection();
                    let replaceStr = `\n\n${matchStr}${selectVal}\n\n`;
                    cm.replaceSelection(replaceStr);
                    cm.setCursor({ line: preLine + 2, ch: (matchStr + selectVal).length });
                }
            }
        } else {
            const cursor = cm.getCursor();
            let { line: curLine, ch: curPos } = cursor; // ??????????????????
            let preStr = cm.getRange({ line: curLine, ch: 0 }, cursor);
            let preBlank = '';
            if (/^( |\t)+/.test(preStr)) {
                // ??????????????????????????????????????????tab??????
                preBlank = preStr.match(/^( |\t)+/)[0];
            }
            curPos && (matchStr = `\n${preBlank}${matchStr}`) && ++curLine;
            cm.replaceSelection(matchStr);
            cm.setCursor({ line: curLine, ch: matchStr.length - 1 });
        }
        cm.focus();
    };

    function orderListInsert() {
        // ??????????????????
        const cm = editor;
        if (cm.somethingSelected()) {
            const selectContent = cm.listSelections()[0]; // ????????????????????????
            let { anchor, head } = selectContent;
            head.line >= anchor.line && head.sticky === 'before' && ([head, anchor] = [anchor, head]);
            let preLine = head.line;
            let aftLine = anchor.line;
            if (preLine !== aftLine) {
                // ????????????????????????????????????????????????
                let preNumber = 0;
                let pos = 0;
                for (let i = preLine; i <= aftLine; i++) {
                    cm.setCursor({ line: i, ch: 0 });
                    const replaceStr = `${++preNumber}. `;
                    cm.replaceSelection(replaceStr);
                    if (i === aftLine) {
                        pos += (replaceStr + cm.getLine(i)).length;
                    }
                }
                cm.setCursor({ line: aftLine, ch: pos });
                cm.focus();
            } else {
                const selectVal = cm.getSelection();
                let preStr = cm.getRange({ line: preLine, ch: 0 }, head);
                let preNumber = 0;
                let preBlank = '';
                if (/^( |\t)+/.test(preStr)) {
                    // ??????????????????????????????????????????tab??????
                    preBlank = preStr.match(/^( |\t)+/)[0];
                    preStr = preStr.trimLeft();
                }
                if (/^\d+(\.) /.test(preStr)) {
                    // ?????????'??????. '??????????????????????????????
                    preNumber = Number.parseInt(preStr.match(/^\d+/)[0]);
                }
                let replaceStr = `\n${preBlank}${preNumber + 1}. ${selectVal}\n`;
                cm.replaceSelection(replaceStr);
                cm.setCursor({ line: preLine + 1, ch: replaceStr.length });
            }
        } else {
            const cursor = cm.getCursor();
            let { line: curLine, ch: curPos } = cursor; // ??????????????????
            let preStr = cm.getRange({ line: curLine, ch: 0 }, cursor);
            let preNumber = 0;
            let preBlank = '';
            if (/^( |\t)+/.test(preStr)) {
                // ??????????????????????????????????????????tab??????
                preBlank = preStr.match(/^( |\t)+/)[0];
                preStr = preStr.trimLeft();
            }
            if (/^\d+(\.) /.test(preStr)) {
                // ?????????'??????. '??????????????????????????????
                preNumber = Number.parseInt(preStr.match(/^\d+/)[0]);
            }
            let replaceStr = `\n${preBlank}${preNumber + 1}. `;
            cm.replaceSelection(replaceStr);
            cm.setCursor({ line: curLine + 1, ch: replaceStr.length - 1 });
        }
    }

    const insertText = (type, matchStr) => {
        switch (type) {
            case 'before':
                beforeInsert(matchStr);
                break;
            case 'middle':
                middleInsert(matchStr);
                break;
            case 'list':
                listInsert(matchStr);
                break;
            case 'orderList':
                orderListInsert();
                break;
        }
    };

    const srollLock = () => {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            scrolling = 0;
            clearTimeout(scrollTimer);
        }, 200);
    };

    const onEditScroll = cm => {
        const { top, height, clientHeight } = cm.getScrollInfo();
        let scale = top / (height - top + clientHeight + 100);
        if (scrolling === 0) scrolling = 1;
        if (scrolling === 2) return;
        let __el = document.getElementById('md-content');
        __el.scrollTop = (__el.scrollHeight - __el.clientHeight - 100) * scale; // scrollTop??????????????????
        srollLock();
    };

    const handleScroll = el => {
        let { scrollHeight, scrollTop, clientHeight } = el.target;
        let scale = scrollTop / (scrollHeight - clientHeight);
        if (scrolling === 0) scrolling = 2;
        if (scrolling === 1) return;
        scrollTop = (scrollHeight + scrollTop - clientHeight) * scale;
        editor.scrollTo(null, scrollTop);
        srollLock();
    };

    function uploadForImage(url, data) {
        let xhr = new XMLHttpRequest();
        let form = new FormData();
        form.append('file_path', data);

        xhr.addEventListener(
            'readystatechange',
            function (e) {
                let response = e.currentTarget.response ? JSON.parse(e.currentTarget.response) : null;
                if (e.currentTarget.readyState === 4 && response) {
                    insertText('before', `![img](${response.file_path})`);
                }
            },
            false
        );

        xhr.open('POST', url, true); // ??????????????????async??????????/??????

        imageUploadConf?.headers &&
            Object.keys(imageUploadConf.headers).forEach(key => {
                xhr.setRequestHeader(key, imageUploadConf.headers[key]);
            });
        xhr.send(form);
    }

    const pasteImg = function (event) {
        var items = event.clipboardData && event.clipboardData.items;
        var file = null;
        if (items && items.length) {
            // ???????????????items
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    file = items[i].getAsFile();
                    uploadForImage(imageUploadConf?.url, file);
                }
            }
        }
    };

    useEffect(() => {
        props.initValue && editor && editor.setValue(props.initValue);
    }, [props.initValue]);

    return (
        <div className="my-md-editor" style={{ height: props.height || '100vh', width: props.width || '100%' }}>
            <div className={`md-editor ${isFullScreen ? 'md-editor-fullscreen' : ''}`}>
                <div className="editor-header">
                    <MdHeader
                        imageUploadConf={imageUploadConf}
                        editor={editor}
                        setThemeConf={setThemeConf}
                        insertText={insertText}
                        setEditMode={setEditMode}
                        isFullScreen={isFullScreen}
                        setIsFullScreen={() => {
                            setIsFullScreen(!isFullScreen);
                        }}
                    />
                </div>
                <div className="editor-content">
                    <div
                        id="editor-editable"
                        className="editor-editable"
                        onPaste={pasteImg}
                        style={{
                            fontSize: theme.fontSize,
                            width: EDIT_MODE[editMode].left_width,
                            display: EDIT_MODE[editMode].left_width === 0 ? 'none' : 'block'
                        }}
                    >
                        <CodeMirror
                            editorDidMount={editor => {
                                setEditor(editor);
                                props.initValue && editor.setValue(props.initValue);
                            }}
                            onChange={(editor, data, value) => {
                                setValue(value);
                                props?.onChange && props.onChange(value);
                            }}
                            onScroll={onEditScroll}
                            options={{
                                mode: 'markdown',
                                theme: theme.editTheme,
                                breaks: true,
                                autofocus: true,
                                styleActiveLine: true,
                                lineNumbers: true,
                                smartIndent: true,
                                lineWrapping: true,
                                foldGutter: true
                            }}
                        />
                    </div>
                    <MDPriview
                        onScroll={e => {
                            handleScroll(e);
                        }}
                        contentTheme={theme.contentTheme}
                        style={{
                            width: EDIT_MODE[editMode].right_width,
                            display: EDIT_MODE[editMode].right_width === 0 ? 'none' : 'block'
                        }}
                        codeHigTheme={theme.codeHig}
                        value={value}
                    />

                    {/* <div
                        id="md-content"
                        onScroll={e => {
                            handleScroll(e);
                        }}
                        className={`md-content md-editor-preview ${theme.contentTheme}`}
                        style={{
                            width: EDIT_MODE[editMode].right_width,
                            display: EDIT_MODE[editMode].right_width === 0 ? 'none' : 'block'
                        }}
                    >
                        <ReactMarkdown components={components} remarkPlugins={[gfm]} allowDangerousHtml>
                            {value}
                        </ReactMarkdown>
                    </div> */}
                </div>
            </div>
        </div>
    );
}

export default MdEditor;
