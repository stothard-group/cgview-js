////////////////////////////////////////////////////////////////////////////////
// Markdown conversion
////////////////////////////////////////////////////////////////////////////////

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


////////////////////////////////////////////////////////////////////////////////
// Side Nav Collapse
////////////////////////////////////////////////////////////////////////////////

// Collapse Side Nav if narrow enough on window resize 
function sideNavCheck() {
  const sidenav = document.getElementById('sidebar-nav');
  if (window.innerWidth < 576) {
    sidenav.classList.add("collapse");
  } else {
    sidenav.classList.remove("collapse");
  }
}

// Adjust side nav on window resize
window.addEventListener("resize", sideNavCheck)
setTimeout(sideNavCheck);


// ////////////////////////////////////////////////////////////////////////////////
// // Bootstrap Scroll Spy fix
// ////////////////////////////////////////////////////////////////////////////////
//
// // Scroll Spy messes up if a link in the side nav has been clicked
// // ie. The page is now an anchor    ..../some_page.html#my_anchor
// function hotfixScrollSpy() {
//   var dataSpyList = [].slice.call(document.querySelectorAll('[data-bs-spy="scroll"]'))
//   let curScroll = getCurrentScroll();
//   dataSpyList.forEach(function (dataSpyEl) {
//     let offsets = bootstrap.ScrollSpy.getInstance(dataSpyEl)['_offsets'];
//     for(let i = 0; i < offsets.length; i++){
//       offsets[i] += curScroll;
//     }
//   })
// }
// function getCurrentScroll() {
//   return window.pageYOffset || document.documentElement.scrollTop;
// }
// window.onload = function () {
//   setTimeout( () => {
//     hotfixScrollSpy();
//     window.scrollBy(0,1);
//   }, 50);
// }
// window.onresize = function () {
//   setTimeout( () => {
//     hotfixScrollSpy();
//     window.scrollBy(0,1);
//   }, 50);
// }





