# babel-plugin-label-switch

一个根据[labeled statement 标记语句](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/label)的标识符进行选择性输出的插件。

适用场景：
** 单文件/单项目书写多平台代码，针对特定平台，在保留该平台代码的同时移除其他平台代码。**

## 参数

-   `prefix`：一个用于识别标识符前缀的正则表达式。为了防止作用到其他标识语句，**必须使用特定前缀**区分，默认的前缀是`case$_*`
    -   type: _RegExp_
    -   default: `/^case\$_/`
-   `map`：一个标识符的映射表，用来决定哪些标记语句需要被移除。若某个标记语句的标识符存在该表里面，且其值为`true`，则保留标记语句的内容。否则整体移除
    -   type: _Object_
    -   default: `{}`

## 例子

-   babel 配置:

```json
{
	"plugins": [
		[
			"babel-plugin-label-switch",
			{
				"prefix": /^myPrefix_/,
				"map": {
					"isNode": false,
					"isBrowser": true,
					"isWxProgram": false
				}
			}
		]
	]
}
```

-   在 js 里面使用上述的标识符：

```javascript
function request(method, url) {
	return new Promise((resolve, reject) => {
		myPrefix_isNode: {
			//node环境发起请求
			require('http')
				.request(
					url,
					{
						method
					},
					function() {
						resolve();
					}
				)
				.end();
		}

		myPrefix_isBrowser: {
			//浏览器环境发起请求
			var xhr = new XMLHttpRequest();
			xhr.open(method, url);
			xhr.onload = function() {
				resolve();
			};
			xhr.send();
		}

		myPrefix_isWxProgram: {
			//小程序环境发起请求
			wx.request({
				url,
				method,
				success: function() {
					resolve();
				}
			});
		}
	});
}
```

-   经过 babel 转换后:

```javascript
function request(method, url) {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		xhr.open(method, url);
		xhr.onload = function() {
			resolve();
		};
		xhr.send();
	});
}
```

## 注意事项

### 不要对插件作用的标识语句使用 `break/continue`

不管当前代码块是保留还是移除，其标识符总会被移除，实际上标识符与其标识语句并不存在于 js 的运行时中，在编译阶段会被移除。

```javascript
//bad
case$_isNode: for (let i = 0; i < 9; i++) {
	loop: for (let j = 0; j < 9; j++) {
		if (i == 1 && j == 1) {
			continue case$_isNode;
		}
	}
}

//good
case$_isNode: {
	loop1: for (let i = 0; i < 9; i++) {
		loop2: for (let j = 0; j < 9; j++) {
			if (i == 1 && j == 1) {
				continue loop1;
			}
		}
	}
}
```

### 作用域问题

-   局部作用域变量
    如果采用了形如`label:{ statement }`的标记语法，则需要注意一下作用域问题。代码经过插件转换后，会移除掉标记语法。若标记语法所标记内容存在`let/const`局部作用域变量，则需要谨慎检查这些变量是否与其他变量同名。

    ```javascript
    const a = 10;
    case$_isNode: {
    	let a = 20;
    	console.log(a);
    }
    
    // ===>转换后：
    const a = 10;
    let a = 20; //<====Error!!!!
    console.log(a);
    ```

-   import 问题
    js 语法规定，`import`必须在最外层的作用域里面执行，如果需要动态选择引入的文件，请使用`require`

-   export 问题
    js 语法规定，`export`必须在最外层的作用域里面执行，因此，需要一些小小的技巧来规避这个问题

    ```javascript
    export default (function() {
    	case$_isNode: {
    		let a = 20;
    		return a;
		}
		case$_isBrowser: {
    		let a = 20;
    		return a;
    	}
    })();
    ```

### 在 typescript 中使用

在 ts 中的使用与 js 类型，需要注意的是，ts 的引入与 js 有些许不同：

```typescript
import * as React from 'react';
import * as TReactDOM from 'react-dom';
import * as TReactDOMServer from 'react-dom/server/';
import App from './app';
export default (function(){
	case$_isBrowser:{
		const ReactDOM:typeof TReactDOM=require('react-dom');
		ReactDOM.render(<App/>,document.getElementById("app"));
	}
	
	case$_isNode:{
		const ReactDOMServer:typeof TReactDOMServer=require('react-dom/server/');
		const str = ReactDOMServer.renderToString(<App/>);
		return str
	}
})();
```
在上述代码中，`TReactDOM` 和 `TReactDOMServer`分别来自`@types/react-dom`和`@types/react-dom/server/`，仅仅是引入typescript的类型文件。真正的引入来自于`require`语句，这样既保留了ts的类型，也实现了动态引入。