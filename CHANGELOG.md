--------------------------------------------------------------------------------
# CGView.js Changelog
--------------------------------------------------------------------------------

## v1.2.0 - 2022-01-21
- Add tags for features and track dataMethod
- Added IO JSON converter for older versions
- Fixed ColorPicker and Highlighter Popup placement
- GeneticCode and format now saved with settings
- Fixed issue with extracting ORFs from contigs
- Ready for release with https://proksee.ca

## v1.1.0 - 2021-09-29
- Remove 'id' attribute from Contig (Use 'name' instead)
- Duplicate Contig and LegendItem names will automically become unique by appending a number
- Added contig.isMapContig property
- Changed contig.hasSeq() to contig.hasSeq (i.e. property instead of function)
- Refresh feature labels when feature start/stop changes
- Default Annotation font changed from 'sans-serif' to 'monospace'
- Changed events:
  - bookmark-shortcut -> bookmarks-shortcut
  - changed 'drag' event to 'zoom'

## v1.0.0 - 2021-08-24
- Initial Release
