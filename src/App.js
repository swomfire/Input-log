import React, { Component } from 'react';
import * as JsDiff from 'diff';
import './App.css';
import { Tooltip } from 'antd';
import moment from 'moment';

function App() {
  return (
    <div className="App">
      <Popup />
    </div>
  );
}

export default App;

var colors = ['#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
  '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
  '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A',
  '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
  '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC',
  '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
  '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680',
  '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
  '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3',
  '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF'];

export class Popup extends Component {
  state = {
    text: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
    // finalText: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
    // text: '',
    finalText: '',
    log: [],
    selectedIndex: null,
  }

  onChange = (e) => {
    const { value } = e.target;
    this.setState({
      text: value,
    })
  }

  onSave = () => {
    const { text, finalText, log } = this.state;
    const { addLog = [] } = log[log.length - 1] || {};
    const changes = JsDiff.diffWords(finalText, text, { ignoreWhitespace: false });
    let index = 0;
    let changeLog = [];
    changes.forEach(change => {
      const { value, added, removed } = change;
      if (removed) {
        changeLog = changeLog.concat({
          type: 'remove',
          value,
          index,
        });
        return;
      }
      if (added) {
        changeLog = changeLog.concat({
          type: 'add',
          value,
          index,
        });
      }
      index += value.length;
    });
    const newAddLog = this.compressLog(addLog, changeLog, log.length + 1);
    this.setState({
      log: changeLog.length !== 0 ? log.concat({ text: finalText, changeLog, addLog: newAddLog }) : log,
      finalText: text,
    })
  }

  selectIndex = (index) => {
    this.setState({
      selectedIndex: index,
    })
  }

  unselectIndex = () => {
    this.setState({
      selectedIndex: null,
    })
  }

  shiftIndex = (array, startIndex, shift) => array.map(item => {
    const { index } = item;
    return {
      ...item,
      index: index >= startIndex ? index + shift : index,
    }
  })

  compressLog = (lastLog, changeLog, index) => {
    let result = lastLog;
    const start = moment();
    let sorted = changeLog
    for (let i = 0; i < sorted.length; i++) {
      const { type, value, index: startAt } = sorted[i];
      if (type === 'add') {
        const existBlock = result.find(({ index: resultIndex, value: resultValue }) => {
          return startAt < resultIndex ||
            (resultIndex + +resultValue.length > startAt)
        }
        );
        if (existBlock) {
          let tmp = [];
          result.forEach(block => {
            const { index: blockIndex, value: blockValue } = block;
            if (blockIndex === existBlock.index) {
              const firstHalf = blockValue.substring(0, startAt - blockIndex);
              const secondHalf = blockValue.substring(startAt - blockIndex, blockValue.length);
              let insertBlocks = [];
              if (firstHalf !== "") {
                insertBlocks = insertBlocks.concat({
                  ...block,
                  index: blockIndex,
                  value: firstHalf,
                });
              }
              const changeBlock = {
                index: firstHalf !== "" ? blockIndex + firstHalf.length : blockIndex,
                value,
                from: index,
              }
              insertBlocks = insertBlocks.concat(changeBlock);
              if (secondHalf !== "") {
                insertBlocks = insertBlocks.concat({
                  ...block,
                  index: blockIndex + value.length + (firstHalf !== "" ? firstHalf.length : 0),
                  value: secondHalf,
                });
              }
              tmp = tmp.concat(insertBlocks);
            } else {
              tmp = tmp.concat({
                ...block,
                index: blockIndex >= existBlock.index ? blockIndex + value.length : blockIndex,
              });
            }
          });
          result = tmp;
        } else {
          const resultIndex = result.length !== 0 ? result[result.length - 1].index + result[result.length - 1].value.length : 0;
          result = result.concat({
            index: resultIndex,
            value,
            from: index,
          });
        }
      }
      if (type === 'remove') {
        const endIndex = startAt + value.length;
        let existBlocks = result.filter(({ index: resultIndex, value: resultValue }) => {
          const start = resultIndex;
          const end = resultIndex + resultValue.length;
          return (start <= startAt && end > startAt)
            || (start <= endIndex && end > endIndex)
            || (start >= startAt && end <= endIndex)
        });
        if (existBlocks.length > 0) {
          let removedFromExistBlock = 0;
          existBlocks.forEach((block) => {
            const { index: blockIndex, value: blockValue } = block;
            const start = startAt - blockIndex;
            const end = endIndex - blockIndex;
            const finalValue = blockValue.substring(0, start) + blockValue.substring(end, blockValue.length + 1);
            let tmp = [];
            const removedCount = blockValue.length - finalValue.length;
            result.forEach(resultBlock => {
              let changeBlock = null;
              if (resultBlock.index === blockIndex - removedFromExistBlock) {
                if (finalValue !== "") {
                  changeBlock = {
                    index: resultBlock.index,
                    value: finalValue,
                    from: resultBlock.from,
                  };
                }
              } else if (resultBlock.index > blockIndex - removedFromExistBlock) {
                const newIndex = resultBlock.index - removedCount;
                changeBlock = {
                  index: newIndex,
                  value: resultBlock.value,
                  from: resultBlock.from,
                };
              } else {
                changeBlock = {
                  index: resultBlock.index,
                  value: resultBlock.value,
                  from: resultBlock.from,
                };
              }
              if (changeBlock !== null) {
                tmp = tmp.concat(changeBlock);
              }
            });
            removedFromExistBlock += removedCount;
            result = tmp;
          })
        }
      }
    }
    // console.log(result);
    const end = moment();
    const { log } = this.state;
    // console.log(`Log[${log.length}] changes[${result.length}], time: ${start.diff(end)}`);
    return result;
  }

  renderLogString = () => {
    const { log, selectedIndex } = this.state;
    const { changeLog, text } = log[selectedIndex];
    let result = text;
    changeLog.sort((a, b) => b.index - a.index).forEach(change => {
      const { type, value, index } = change;
      const header = type === "add" ? '<span style="color: green;">' : '<span style="color: red;">';
      result = result.substring(0, index) + header + value + '</span>' + result.substring(type === 'add' ? index : index + +value.length);
    })
    return result;
  }

  renderLogInfo = (index) => (
    <div>
      <p>Created By: log {index}</p>
      <p>At: </p>
    </div>
  );

  renderFinalLog = () => {
    const { finalText, log } = this.state;
    const content = log.length > 0 ? log[log.length - 1].addLog.sort((a, b) => a.index - b.index).map(({ index: itemIndex, value, from }, index) => (
      <Tooltip key={itemIndex} placement="top" title={this.renderLogInfo(from)}>
        <span style={{ background: colors[from - 1] }}>
          {value}
        </span>
      </Tooltip>
    )) : finalText;
    return content;
  }

  render() {
    const { text, log, selectedIndex } = this.state;
    return (
      <div>
        <ul onMouseOut={this.unselectIndex}>
          {log.map((value, index) => <li style={{ background: colors[index] }} onMouseEnter={() => this.selectIndex(index)} key={index}>Log {index}</li>)}
        </ul>
        <br />
        {selectedIndex === null ? this.renderFinalLog() : <div dangerouslySetInnerHTML={{ __html: this.renderLogString() }} />}
        <br />
        <textarea onChange={this.onChange} value={text} style={{ width: "800px", height: "300px" }} />
        <button type="button" onClick={this.onSave}>Save</button>
      </div>
    )
  }
}