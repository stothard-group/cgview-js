// Takes text in #markdown-in and
//  - convert to markdown and moves it to #markdown-out
//  - evals the code
//  - copies code without comments to #final-code
// see https://github.com/chjj/marked
function tutorialMarkdown(marked, addFinalCode) {
  //  marked.setOptions({
  //    sanitize: true
  //  });
  var marked_ = marked;
  var marked = function(text) {
    var tok = marked_.lexer(text);
    text = marked_.parser(tok);
    text = text.replace(/<pre>/ig, '<pre class="prettyprint">');
    text = text.replace(/&amp;gt;/g, '>');
    text = text.replace(/&amp;lt;/g, '<');
    return text;
  };

  var inEl = document.querySelector('#markdown-in');
  var outEl = document.querySelector('#markdown-out');
  outEl.innerHTML = marked( inEl.innerHTML );

  // Takes all the code block on the page
  // Copies the code (minus the comments) to an element with the id $(#final-code code)
  // Run the code as well. This is great for demos of CGView.
  if (addFinalCode) {
    var finalCode = document.querySelector('#final-code code');
    var codeEls = document.querySelectorAll('code.language-js:not(.final)');
    codeEls.forEach( function(el) {
      var code = el.innerHTML.replace(/\s*\/\/.*/g, '');
      code = code.replace('&lt;', '<');
      code = code.replace('&gt;', '>');
      // console.log(code);
      eval( code );
      var textNode = document.createTextNode( code + "\n" );
      finalCode.appendChild(textNode);
    });
  }
}
