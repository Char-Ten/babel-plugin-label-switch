const PREFIX_RXG = /^case\$_/;
module.exports=function(babel){
	return {
		pre(state){
			let prefix = state.opts.prefix;
			if(prefix instanceof RegExp){
				this.prefix = prefix
				return
			}
			if(typeof prefix === 'string'){
				this.prefix = new RegExp(prefix);
				return 
			}
			this.prefix = PREFIX_RXG;
		},
		visitor:{
			LabeledStatement:function(path,state){
				const options = state.opts.map||{};
				let prefix = this.prefix;
				let name = path.node.label.name;
				if(!prefix.test(name)){
					return 
				}
				name=name.replace(prefix,'');
				if(options[name]){
					path.replaceWith(path.node.body)
					return
				}
				path.remove();
			}
		}
	}
}