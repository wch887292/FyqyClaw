export interface LanguageDefinition {
  id: string
  name: string
  extensions: string[]
  keywords: string[]
  builtins: string[]
  snippets: LanguageSnippet[]
  commentStyle: string
  stringQuotes: string[]
  indentation: number
}

export interface LanguageSnippet {
  prefix: string
  body: string[]
  description: string
}

export class LanguageSupportProvider {
  private languages: Map<string, LanguageDefinition> = new Map()

  constructor() {
    this.registerLanguages()
  }

  getLanguage(id: string): LanguageDefinition | undefined {
    return this.languages.get(id)
  }

  getLanguageByExtension(ext: string): LanguageDefinition | undefined {
    for (const lang of this.languages.values()) {
      if (lang.extensions.includes(ext)) return lang
    }
    return undefined
  }

  getAllLanguages(): LanguageDefinition[] {
    return Array.from(this.languages.values())
  }

  getKeywords(languageId: string): string[] {
    return this.languages.get(languageId)?.keywords || []
  }

  getSnippets(languageId: string): LanguageSnippet[] {
    return this.languages.get(languageId)?.snippets || []
  }

  private registerLanguages(): void {
    this.registerTypeScript()
    this.registerPython()
    this.registerGo()
    this.registerRust()
    this.registerJava()
    this.registerJavaScript()
    this.registerCPP()
    this.registerCSharp()
    this.registerRuby()
    this.registerPHP()
    this.registerSwift()
    this.registerKotlin()
    this.registerSQL()
    this.registerShell()
    this.registerHTML()
    this.registerCSS()
  }

  private registerTypeScript(): void {
    this.languages.set('typescript', {
      id: 'typescript',
      name: 'TypeScript',
      extensions: ['ts', 'tsx'],
      keywords: ['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum', 'extends', 'implements', 'abstract', 'public', 'private', 'protected', 'readonly', 'static', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'throw', 'try', 'catch', 'finally', 'import', 'export', 'from', 'of', 'in', 'typeof', 'keyof', 'new', 'this', 'super', 'yield', 'declare', 'namespace', 'module', 'as', 'any', 'unknown', 'never', 'void', 'undefined', 'null', 'boolean', 'string', 'number', 'symbol', 'bigint', 'true', 'false'],
      builtins: ['console', 'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Promise', 'Map', 'Set', 'RegExp', 'Error', 'Set', 'WeakMap', 'WeakSet', 'Proxy', 'Reflect', 'Buffer', 'process', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch', 'require', 'module', 'exports', '__dirname', '__filename', 'global', 'globalThis'],
      snippets: [
        { prefix: 'log', body: ['console.log($1)'], description: 'Console log' },
        { prefix: 'imp', body: ['import { $1 } from \'$2\''], description: 'Import statement' },
        { prefix: 'exp', body: ['export { $1 }'], description: 'Export statement' },
        { prefix: 'fn', body: ['function ${1:name}(${2:params}) {', '  ${3}', '}'], description: 'Function declaration' },
        { prefix: 'afn', body: ['async function ${1:name}(${2:params}) {', '  await ${3}', '}'], description: 'Async function' },
        { prefix: 'arr', body: ['${1:name}.map((${2:item}) => ${3:item})'], description: 'Array map' },
        { prefix: 'filter', body: ['${1:name}.filter((${2:item}) => ${3:condition})'], description: 'Array filter' },
        { prefix: 'reduce', body: ['${1:name}.reduce((${2:acc}, ${3:cur}) => ${4:acc + cur}, ${5:initial})'], description: 'Array reduce' },
        { prefix: 'afe', body: ['${1:name}.forEach((${2:item}) => {', '  ${3}', '})'], description: 'Array forEach' },
        { prefix: 'if', body: ['if (${1:condition}) {', '  ${2}', '}'], description: 'If statement' },
        { prefix: 'ife', body: ['if (${1:condition}) {', '  ${2}', '} else {', '  ${3}', '}'], description: 'If-else statement' },
        { prefix: 'for', body: ['for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {', '  ${3}', '}'], description: 'For loop' },
        { prefix: 'forof', body: ['for (const ${1:item} of ${2:array}) {', '  ${3}', '}'], description: 'For-of loop' },
        { prefix: 'try', body: ['try {', '  ${1}', '} catch (${2:error}) {', '  ${3}', '}'], description: 'Try-catch block' },
        { prefix: 'cl', body: ['class ${1:name} {', '  constructor(${2:params}) {', '    ${3}', '  }', '}'], description: 'Class declaration' },
        { prefix: 'iface', body: ['interface ${1:name} {', '  ${2:prop}: ${3:type}', '}'], description: 'Interface declaration' },
        { prefix: 'type', body: ['type ${1:name} = ${2:type}'], description: 'Type alias' },
        { prefix: 'usestate', body: ['const [${1:state}, set${1:state}] = useState(${2:initial})'], description: 'React useState hook' },
        { prefix: 'useeffect', body: ['useEffect(() => {', '  ${1}', '  return () => { ${2} }', '}, [${3}])'], description: 'React useEffect hook' },
        { prefix: 'useref', body: ['const ${1:ref} = useRef(${2:initial})'], description: 'React useRef hook' },
      ],
      commentStyle: '//',
      stringQuotes: ["'", '"', '`'],
      indentation: 2,
    })
  }

  private registerJavaScript(): void {
    const ts = this.languages.get('typescript')!
    this.languages.set('javascript', {
      ...ts,
      id: 'javascript',
      name: 'JavaScript',
      extensions: ['js', 'jsx', 'mjs', 'cjs'],
      keywords: ts.keywords.filter(k => !['interface', 'type', 'enum', 'implements', 'abstract', 'declare', 'namespace', 'module', 'as', 'keyof', 'readonly'].includes(k)),
      builtins: ts.builtins,
      snippets: ts.snippets.filter(s => !['iface', 'type'].includes(s.prefix)),
    })
  }

  private registerPython(): void {
    this.languages.set('python', {
      id: 'python',
      name: 'Python',
      extensions: ['py', 'pyw', 'pyx'],
      keywords: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'try', 'except', 'finally', 'raise', 'import', 'from', 'as', 'with', 'yield', 'lambda', 'pass', 'del', 'global', 'nonlocal', 'assert', 'async', 'await', 'True', 'False', 'None', 'in', 'is', 'not', 'and', 'or', 'self', 'cls', 'super'],
      builtins: ['print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'type', 'open', 'input', 'isinstance', 'hasattr', 'getattr', 'setattr', 'map', 'filter', 'zip', 'enumerate', 'sorted', 'reversed', 'any', 'all', 'sum', 'min', 'max', 'abs', 'round', 'pow', 'divmod', 'hex', 'oct', 'bin', 'ord', 'chr', 'format', 'repr', 'eval', 'exec', 'compile', '__init__', '__str__', '__repr__', '__call__', '__len__', '__getitem__', '__setitem__', '__iter__', '__next__', '__enter__', '__exit__'],
      snippets: [
        { prefix: 'def', body: ['def ${1:name}(${2:params}):', '    ${3:pass}'], description: 'Function definition' },
        { prefix: 'class', body: ['class ${1:Name}:', '    def __init__(self, ${2:params}):', '        ${3:pass}'], description: 'Class definition' },
        { prefix: 'if', body: ['if ${1:condition}:', '    ${2:pass}'], description: 'If statement' },
        { prefix: 'ife', body: ['if ${1:condition}:', '    ${2:pass}', 'else:', '    ${3:pass}'], description: 'If-else statement' },
        { prefix: 'elif', body: ['elif ${1:condition}:', '    ${2:pass}'], description: 'Elif statement' },
        { prefix: 'for', body: ['for ${1:item} in ${2:iterable}:', '    ${3:pass}'], description: 'For loop' },
        { prefix: 'while', body: ['while ${1:condition}:', '    ${2:pass}'], description: 'While loop' },
        { prefix: 'try', body: ['try:', '    ${1:pass}', 'except ${2:Exception} as ${3:e}:', '    ${4:pass}'], description: 'Try-except block' },
        { prefix: 'with', body: ['with ${1:context} as ${2:var}:', '    ${3:pass}'], description: 'With context manager' },
        { prefix: 'afn', body: ['async def ${1:name}(${2:params}):', '    await ${3}'], description: 'Async function' },
        { prefix: 'imp', body: ['import ${1:module}'], description: 'Import module' },
        { prefix: 'from', body: ['from ${1:module} import ${2:symbol}'], description: 'Import from module' },
        { prefix: 'lam', body: ['lambda ${1:x}: ${2:expression}'], description: 'Lambda function' },
        { prefix: 'listcomp', body: ['[${1:expr} for ${2:item} in ${3:iterable} ${4:if condition}]'], description: 'List comprehension' },
        { prefix: 'dictcomp', body: ['{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}'], description: 'Dict comprehension' },
        { prefix: 'main', body: ['if __name__ == \'__main__\':', '    ${1:pass}'], description: 'Main guard' },
        { prefix: 'deco', body: ['@${1:decorator}', 'def ${2:name}(${3:params}):', '    ${4:pass}'], description: 'Decorator' },
        { prefix: 'enum', body: ['from enum import Enum', '', 'class ${1:Name}(Enum):', '    ${2:MEMBER} = ${3:value}'], description: 'Enum class' },
        { prefix: 'dataclass', body: ['from dataclasses import dataclass', '', '@dataclass', 'class ${1:Name}:', '    ${2:field}: ${3:type}'], description: 'Data class' },
      ],
      commentStyle: '#',
      stringQuotes: ["'", '"', "'''", '"""'],
      indentation: 4,
    })
  }

  private registerGo(): void {
    this.languages.set('go', {
      id: 'go',
      name: 'Go',
      extensions: ['go'],
      keywords: ['func', 'type', 'struct', 'interface', 'var', 'const', 'import', 'package', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'go', 'defer', 'select', 'chan', 'map', 'make', 'new', 'nil', 'true', 'false', 'len', 'cap', 'append', 'copy', 'close', 'delete', 'panic', 'recover', 'fallthrough', 'goto', 'uint8', 'uint16', 'uint32', 'uint64', 'int8', 'int16', 'int32', 'int64', 'float32', 'float64', 'complex64', 'complex128', 'byte', 'rune', 'string', 'bool', 'int', 'uint', 'uintptr', 'error'],
      builtins: ['fmt', 'os', 'io', 'net', 'http', 'json', 'time', 'strings', 'strconv', 'math', 'sort', 'sync', 'errors', 'log', 'flag', 'path', 'filepath', 'reflect', 'regexp', 'context', 'crypto', 'encoding', 'database', 'testing', 'bufio', 'compress', 'container', 'encoding/json', 'net/http', 'sync/atomic', 'io/ioutil', 'os/exec', 'path/filepath', 'strings', 'time'],
      snippets: [
        { prefix: 'fn', body: ['func ${1:name}(${2:params}) ${3:returnType} {', '    ${4:return nil}', '}'], description: 'Function declaration' },
        { prefix: 'struct', body: ['type ${1:Name} struct {', '    ${2:field} ${3:type}', '}'], description: 'Struct definition' },
        { prefix: 'iface', body: ['type ${1:Name} interface {', '    ${2:Method}(${3:params}) ${4:returnType}', '}'], description: 'Interface definition' },
        { prefix: 'method', body: ['func (${1:receiver} ${2:Type}) ${3:name}(${4:params}) ${5:returnType} {', '    ${6:return nil}', '}'], description: 'Method declaration' },
        { prefix: 'for', body: ['for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {', '    ${3}', '}'], description: 'For loop' },
        { prefix: 'forr', body: ['for ${1:index}, ${2:value} := range ${3:slice} {', '    ${4}', '}'], description: 'For-range loop' },
        { prefix: 'if', body: ['if ${1:condition} {', '    ${2}', '}'], description: 'If statement' },
        { prefix: 'ife', body: ['if ${1:condition} {', '    ${2}', '} else {', '    ${3}', '}'], description: 'If-else statement' },
        { prefix: 'switch', body: ['switch ${1:value} {', 'case ${2:val}:', '    ${3}', 'default:', '    ${4}', '}'], description: 'Switch statement' },
        { prefix: 'go', body: ['go ${1:func}(${2:args})'], description: 'Goroutine' },
        { prefix: 'defer', body: ['defer ${1:func}(${2:args})'], description: 'Defer statement' },
        { prefix: 'select', body: ['select {', 'case <-${1:ch}:', '    ${2}', 'default:', '    ${3}', '}'], description: 'Select statement' },
        { prefix: 'err', body: ['if err != nil {', '    return ${1:nil}, err', '}'], description: 'Error handling' },
        { prefix: 'make', body: ['make(${1:type}, ${2:length})'], description: 'Make slice/map/chan' },
        { prefix: 'map', body: ['map[${1:keyType}]${2:valueType}'], description: 'Map type' },
        { prefix: 'chan', body: ['make(chan ${1:type}, ${2:buffer})'], description: 'Channel' },
        { prefix: 'main', body: ['func main() {', '    ${1}', '}'], description: 'Main function' },
        { prefix: 'init', body: ['func init() {', '    ${1}', '}'], description: 'Init function' },
        { prefix: 'test', body: ['func Test${1:Name}(t *testing.T) {', '    ${2:t.Log("test")}', '}'], description: 'Test function' },
      ],
      commentStyle: '//',
      stringQuotes: ['"', '`'],
      indentation: 4,
    })
  }

  private registerRust(): void {
    this.languages.set('rust', {
      id: 'rust',
      name: 'Rust',
      extensions: ['rs'],
      keywords: ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'impl', 'trait', 'pub', 'use', 'mod', 'crate', 'self', 'super', 'return', 'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue', 'in', 'where', 'type', 'ref', 'move', 'async', 'await', 'unsafe', 'extern', 'macro_rules', 'abstract', 'become', 'box', 'do', 'final', 'override', 'priv', 'typeof', 'unsized', 'virtual', 'yield', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'as', 'dyn', 'impl', 'let', 'fn', 'mut', 'ref', 'const'],
      builtins: ['std', 'Vec', 'String', 'Option', 'Result', 'Box', 'Rc', 'Arc', 'Cell', 'RefCell', 'HashMap', 'HashSet', 'Iterator', 'Clone', 'Copy', 'Debug', 'Display', 'Eq', 'PartialEq', 'Ord', 'PartialOrd', 'Hash', 'Default', 'From', 'Into', 'TryFrom', 'TryInto', 'FromStr', 'ToString', 'AsRef', 'AsMut', 'Deref', 'DerefMut', 'Drop', 'Send', 'Sync', 'Sized', 'module', 'println!', 'format!', 'vec!', 'panic!', 'unimplemented!', 'unreachable!', 'assert!', 'assert_eq!', 'assert_ne!', 'todo!', 'eprintln!', 'dbg!', 'include_str!', 'include_bytes!'],
      snippets: [
        { prefix: 'fn', body: ['fn ${1:name}(${2:params}) -> ${3:returnType} {', '    ${4:todo!()}', '}'], description: 'Function declaration' },
        { prefix: 'struct', body: ['struct ${1:Name} {', '    ${2:field}: ${3:type},', '}'], description: 'Struct definition' },
        { prefix: 'enum', body: ['enum ${1:Name} {', '    ${2:Variant},', '}'], description: 'Enum definition' },
        { prefix: 'impl', body: ['impl ${1:Name} {', '    fn ${2:method}(&self) -> ${3:returnType} {', '        ${4:todo!()}', '    }', '}'], description: 'Implementation block' },
        { prefix: 'trait', body: ['trait ${1:Name} {', '    fn ${2:method}(&self) -> ${3:returnType};', '}'], description: 'Trait definition' },
        { prefix: 'match', body: ['match ${1:value} {', '    ${2:pattern} => ${3:result},', '    _ => ${4:default},', '}'], description: 'Match expression' },
        { prefix: 'iflet', body: ['if let ${1:pattern} = ${2:value} {', '    ${3}', '}'], description: 'If-let pattern' },
        { prefix: 'for', body: ['for ${1:item} in ${2:iterable} {', '    ${3}', '}'], description: 'For loop' },
        { prefix: 'loop', body: ['loop {', '    ${1:break}', '}'], description: 'Infinite loop' },
        { prefix: 'let', body: ['let ${1:mut} ${2:name} = ${3:value};'], description: 'Let binding' },
        { prefix: 'fnret', body: ['fn ${1:name}(${2:params}) -> Result<${3:T}, ${4:E}> {', '    Ok(${5:value})', '}'], description: 'Function returning Result' },
        { prefix: 'use', body: ['use ${1:crate}::${2:module};'], description: 'Use statement' },
        { prefix: 'mod', body: ['mod ${1:name} {', '    ${2}', '}'], description: 'Module declaration' },
        { prefix: 'pubfn', body: ['pub fn ${1:name}(${2:params}) -> ${3:returnType} {', '    ${4:todo!()}', '}'], description: 'Public function' },
        { prefix: 'derive', body: ['#[derive(Debug, Clone, PartialEq)]', 'struct ${1:Name} {', '    ${2:field}: ${3:type},', '}'], description: 'Derive macro' },
        { prefix: 'test', body: ['#[test]', 'fn test_${1:name}() {', '    assert_eq!(${2:expected}, ${3:actual});', '}'], description: 'Test function' },
        { prefix: 'implfmt', body: ['impl fmt::Display for ${1:Name} {', '    fn fmt(&self, f: &mut fmt::Formatter<\'_>) -> fmt::Result {', '        write!(f, "${2:format}", ${3:self.field})', '    }', '}'], description: 'Display implementation' },
        { prefix: 'vec', body: ['vec![${1:value}]'], description: 'Vector macro' },
        { prefix: 'err', body: ['return Err(${1:error}.into())'], description: 'Return error' },
        { prefix: 'unwrap', body: ['${1:result}.unwrap()'], description: 'Unwrap result' },
        { prefix: 'expect', body: ['${1:result}.expect("${2:message}")'], description: 'Expect with message' },
      ],
      commentStyle: '//',
      stringQuotes: ['"'],
      indentation: 4,
    })
  }

  private registerJava(): void {
    this.languages.set('java', {
      id: 'java',
      name: 'Java',
      extensions: ['java'],
      keywords: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements', 'new', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'throw', 'throws', 'try', 'catch', 'finally', 'import', 'package', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'String', 'this', 'super', 'null', 'true', 'false', 'enum', 'volatile', 'transient', 'synchronized', 'native', 'strictfp', 'var', 'record', 'sealed', 'permits', 'instanceof', 'assert'],
      builtins: ['System', 'Math', 'Object', 'String', 'StringBuilder', 'StringBuffer', 'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Character', 'Byte', 'Short', 'List', 'ArrayList', 'LinkedList', 'Map', 'HashMap', 'LinkedHashMap', 'TreeMap', 'Set', 'HashSet', 'TreeSet', 'Optional', 'Stream', 'Collectors', 'Arrays', 'Collections', 'Comparator', 'Comparable', 'Runnable', 'Callable', 'Thread', 'Executor', 'Exception', 'RuntimeException', 'IllegalArgumentException', 'NullPointerException', 'IOException', 'File', 'Path', 'Files', 'BufferedReader', 'BufferedWriter', 'InputStream', 'OutputStream', 'Logger', 'Pattern', 'Matcher', 'Date', 'LocalDate', 'LocalTime', 'LocalDateTime', 'BigDecimal', 'BigInteger'],
      snippets: [
        { prefix: 'class', body: ['public class ${1:Name} {', '    ${2:public ${1:Name}() {', '        ${3}', '    }}', '}'], description: 'Class declaration' },
        { prefix: 'main', body: ['public static void main(String[] args) {', '    ${1:System.out.println("Hello");}', '}'], description: 'Main method' },
        { prefix: 'method', body: ['public ${1:returnType} ${2:method}(${3:params}) {', '    ${4:return null;}', '}'], description: 'Method declaration' },
        { prefix: 'if', body: ['if (${1:condition}) {', '    ${2}', '}'], description: 'If statement' },
        { prefix: 'for', body: ['for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {', '    ${3}', '}'], description: 'For loop' },
        { prefix: 'foreach', body: ['for (${1:Type} ${2:item} : ${3:collection}) {', '    ${4}', '}'], description: 'For-each loop' },
        { prefix: 'try', body: ['try {', '    ${1}', '} catch (${2:Exception} ${3:e}) {', '    ${4:e.printStackTrace();}', '}'], description: 'Try-catch block' },
        { prefix: 'sout', body: ['System.out.println(${1});'], description: 'System out println' },
        { prefix: 'list', body: ['List<${1:String}> ${2:list} = new ArrayList<>();'], description: 'Create ArrayList' },
        { prefix: 'map', body: ['Map<${1:String}, ${2:Integer}> ${3:map} = new HashMap<>();'], description: 'Create HashMap' },
        { prefix: 'optional', body: ['Optional<${1:Type}> ${2:opt} = Optional.ofNullable(${3:value});'], description: 'Optional' },
        { prefix: 'stream', body: ['${1:list}.stream()', '    .filter(${2:item} -> ${3:condition})', '    .collect(Collectors.toList());'], description: 'Stream pipeline' },
        { prefix: 'iface', body: ['public interface ${1:Name} {', '    ${2:void ${3:method}();}', '}'], description: 'Interface declaration' },
        { prefix: 'enum', body: ['public enum ${1:Name} {', '    ${2:VALUE1}, ${3:VALUE2};', '}'], description: 'Enum declaration' },
        { prefix: 'record', body: ['public record ${1:Name}(${2:Type} ${3:field}) {', '}'], description: 'Record declaration' },
        { prefix: 'log', body: ['private static final Logger log = Logger.getLogger(${1:ClassName}.class.getName());'], description: 'Logger declaration' },
        { prefix: 'new', body: ['new ${1:ClassName}(${2:params})'], description: 'New instance' },
        { prefix: 'return', body: ['return ${1:value};'], description: 'Return statement' },
        { prefix: 'throw', body: ['throw new ${1:IllegalArgumentException}("${2:message}");'], description: 'Throw exception' },
        { prefix: 'test', body: ['@Test', 'public void test${1:Name}() {', '    assertEquals(${2:expected}, ${3:actual});', '}'], description: 'JUnit test' },
      ],
      commentStyle: '//',
      stringQuotes: ['"'],
      indentation: 4,
    })
  }

  private registerCPP(): void {
    this.languages.set('cpp', {
      id: 'cpp',
      name: 'C++',
      extensions: ['cpp', 'cxx', 'cc', 'c', 'h', 'hpp', 'hxx'],
      keywords: ['auto', 'break', 'case', 'catch', 'class', 'const', 'constexpr', 'continue', 'decltype', 'default', 'delete', 'do', 'else', 'enum', 'explicit', 'export', 'extern', 'false', 'final', 'for', 'friend', 'goto', 'if', 'inline', 'mutable', 'namespace', 'new', 'noexcept', 'nullptr', 'operator', 'override', 'private', 'protected', 'public', 'register', 'return', 'sizeof', 'static', 'static_cast', 'struct', 'switch', 'template', 'this', 'throw', 'true', 'try', 'typedef', 'typeid', 'typename', 'union', 'using', 'virtual', 'void', 'volatile', 'while', 'int', 'long', 'double', 'float', 'char', 'bool', 'short', 'unsigned', 'signed', 'size_t', 'string', 'vector', 'map', 'set', 'shared_ptr', 'unique_ptr', 'weak_ptr', 'function', 'pair', 'tuple', 'optional', 'any', 'variant'],
      builtins: ['std', 'cout', 'cin', 'cerr', 'endl', 'vector', 'string', 'map', 'unordered_map', 'set', 'unordered_set', 'stack', 'queue', 'deque', 'priority_queue', 'list', 'pair', 'tuple', 'optional', 'any', 'variant', 'shared_ptr', 'unique_ptr', 'weak_ptr', 'make_shared', 'make_unique', 'function', 'bind', 'ref', 'cref', 'thread', 'mutex', 'lock_guard', 'unique_lock', 'condition_variable', 'future', 'promise', 'async', 'chrono', 'regex', 'random', 'filesystem', 'iostream', 'fstream', 'sstream', 'algorithm', 'numeric', 'iterator', 'memory', 'utility'],
      snippets: [
        { prefix: 'fn', body: ['${1:returnType} ${2:name}(${3:params}) {', '    ${4:return ${5:value};}', '}'], description: 'Function declaration' },
        { prefix: 'class', body: ['class ${1:Name} {', 'public:', '    ${1:Name}() = default;', '    ~${1:Name}() = default;', 'private:', '    ${2:type} ${3:field};', '};'], description: 'Class declaration' },
        { prefix: 'struct', body: ['struct ${1:Name} {', '    ${2:type} ${3:field};', '};'], description: 'Struct declaration' },
        { prefix: 'for', body: ['for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {', '    ${3}', '}'], description: 'For loop' },
        { prefix: 'foreach', body: ['for (const auto& ${1:item} : ${2:container}) {', '    ${3}', '}'], description: 'Range-based for loop' },
        { prefix: 'if', body: ['if (${1:condition}) {', '    ${2}', '}'], description: 'If statement' },
        { prefix: 'include', body: ['#include <${1:header}>'], description: 'Include directive' },
        { prefix: 'namespace', body: ['namespace ${1:name} {', '    ${2}', '}'], description: 'Namespace' },
        { prefix: 'template', body: ['template<typename ${1:T}>', '${2:class} ${3:Name} {', '    ${4}', '};'], description: 'Template declaration' },
        { prefix: 'smartptr', body: ['auto ${1:ptr} = std::make_shared<${2:Type}>(${3:args});'], description: 'Smart pointer' },
        { prefix: 'lambda', body: ['[${1:capture}](${2:params}) -> ${3:returnType} {', '    ${4:return ${5:value};}', '}'], description: 'Lambda expression' },
        { prefix: 'main', body: ['int main(int argc, char* argv[]) {', '    ${1:return 0;}', '}'], description: 'Main function' },
        { prefix: 'cout', body: ['std::cout << ${1:value} << std::endl;'], description: 'Console output' },
        { prefix: 'cin', body: ['std::cin >> ${1:variable};'], description: 'Console input' },
        { prefix: 'thread', body: ['std::thread ${1:t}(${2:func}, ${3:args});', '${1:t}.join();'], description: 'Thread creation' },
        { prefix: 'mutex', body: ['std::mutex ${1:mtx};', '{', '    std::lock_guard<std::mutex> lock(${1:mtx});', '    ${2}', '}'], description: 'Mutex with lock guard' },
        { prefix: 'ifndef', body: ['#ifndef ${1:HEADER_H}', '#define ${1:HEADER_H}', '', '${2}', '', '#endif'], description: 'Header guard' },
        { prefix: 'new', body: ['auto ${1:ptr} = new ${2:Type}(${3:args});'], description: 'Dynamic allocation' },
        { prefix: 'delete', body: ['delete ${1:ptr};'], description: 'Deallocation' },
        { prefix: 'vec', body: ['std::vector<${1:Type}> ${2:vec} = {${3:values}};'], description: 'Vector declaration' },
      ],
      commentStyle: '//',
      stringQuotes: ['"'],
      indentation: 4,
    })
  }

  private registerCSharp(): void {
    this.languages.set('csharp', {
      id: 'csharp',
      name: 'C#',
      extensions: ['cs', 'csx'],
      keywords: ['public', 'private', 'protected', 'internal', 'static', 'readonly', 'virtual', 'override', 'abstract', 'sealed', 'async', 'await', 'class', 'struct', 'interface', 'enum', 'record', 'namespace', 'using', 'new', 'return', 'if', 'else', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'break', 'continue', 'throw', 'try', 'catch', 'finally', 'var', 'dynamic', 'null', 'true', 'false', 'this', 'base', 'partial', 'event', 'delegate', 'is', 'as', 'typeof', 'sizeof', 'nameof', 'in', 'out', 'ref', 'value', 'void', 'int', 'long', 'double', 'float', 'decimal', 'bool', 'char', 'byte', 'short', 'string', 'object', 'uint', 'ulong', 'ushort', 'sbyte', 'nint', 'nuint'],
      builtins: ['Console', 'String', 'Int32', 'Int64', 'Double', 'Single', 'Decimal', 'Boolean', 'DateTime', 'TimeSpan', 'Guid', 'Task', 'Task<T>', 'List<T>', 'Dictionary<T>', 'HashSet<T>', 'IEnumerable<T>', 'IQueryable<T>', 'Func<T>', 'Action<T>', 'Predicate<T>', 'Nullable<T>', 'Lazy<T>', 'HttpClient', 'Stream', 'File', 'Path', 'Directory', 'Regex', 'StringBuilder', 'Array', 'Math', 'Random', 'Exception', 'ArgumentNullException', 'InvalidOperationException', 'CancellationToken', 'CancellationTokenSource', 'TaskCompletionSource'],
      snippets: [
        { prefix: 'class', body: ['public class ${1:Name} {', '    public ${1:Name}() {', '        ${2}', '    }', '}'], description: 'Class declaration' },
        { prefix: 'method', body: ['public ${1:returnType} ${2:Method}(${3:params}) {', '    ${4:throw new NotImplementedException();}', '}'], description: 'Method declaration' },
        { prefix: 'prop', body: ['public ${1:type} ${2:Property} { get; set; }'], description: 'Auto property' },
        { prefix: 'if', body: ['if (${1:condition}) {', '    ${2}', '}'], description: 'If statement' },
        { prefix: 'for', body: ['for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {', '    ${3}', '}'], description: 'For loop' },
        { prefix: 'foreach', body: ['foreach (var ${1:item} in ${2:collection}) {', '    ${3}', '}'], description: 'Foreach loop' },
        { prefix: 'try', body: ['try {', '    ${1}', '} catch (${2:Exception} ${3:ex}) {', '    ${4:throw;}', '}'], description: 'Try-catch block' },
        { prefix: 'cw', body: ['Console.WriteLine(${1});'], description: 'Console WriteLine' },
        { prefix: 'iface', body: ['public interface I${1:Name} {', '    ${2:void ${3:Method}();}', '}'], description: 'Interface declaration' },
        { prefix: 'struct', body: ['public struct ${1:Name} {', '    public ${1:Name}(${2:params}) {', '        ${3}', '    }', '}'], description: 'Struct declaration' },
        { prefix: 'enum', body: ['public enum ${1:Name} {', '    ${2:Value1},', '    ${3:Value2}', '}'], description: 'Enum declaration' },
        { prefix: 'linq', body: ['${1:source}.Where(${2:x} => ${3:condition}).Select(${2:x} => ${4:x});'], description: 'LINQ query' },
        { prefix: 'async', body: ['public async Task<${1:returnType}> ${2:Method}Async(${3:params}) {', '    return await ${4:Task.FromResult(${5:result});}', '}'], description: 'Async method' },
        { prefix: 'ctor', body: ['public ${1:ClassName}(${2:params}) {', '    ${3}', '}'], description: 'Constructor' },
        { prefix: 'region', body: ['#region ${1:name}', '', '${2}', '#endregion'], description: 'Region directive' },
        { prefix: 'nullcheck', body: ['if (${1:value} == null) throw new ArgumentNullException(nameof(${1:value}));'], description: 'Null check' },
        { prefix: 'using', body: ['using (var ${1:resource} = new ${2:Resource}()) {', '    ${3}', '}'], description: 'Using statement' },
        { prefix: 'lock', body: ['lock (${1:lockObject}) {', '    ${2}', '}'], description: 'Lock statement' },
        { prefix: 'main', body: ['static void Main(string[] args) {', '    ${1:Console.WriteLine("Hello");}', '}'], description: 'Main method' },
        { prefix: 'record', body: ['public record ${1:Name}(${2:Type} ${3:Property});'], description: 'Record declaration' },
      ],
      commentStyle: '//',
      stringQuotes: ['"', "'"],
      indentation: 4,
    })
  }

  private registerRuby(): void {
    this.languages.set('ruby', {
      id: 'ruby',
      name: 'Ruby',
      extensions: ['rb', 'ruby'],
      keywords: ['def', 'class', 'module', 'end', 'if', 'elsif', 'else', 'unless', 'case', 'when', 'while', 'until', 'for', 'in', 'do', 'begin', 'rescue', 'ensure', 'yield', 'return', 'self', 'super', 'true', 'false', 'nil', 'and', 'or', 'not', 'defined?', 'alias', 'undef', 'require', 'include', 'extend', 'prepend', 'raise', 'throw', 'catch', 'lambda', 'proc', 'block_given?', '__FILE__', '__LINE__', '__ENCODING__'],
      builtins: ['puts', 'print', 'p', 'require', 'include', 'attr_reader', 'attr_writer', 'attr_accessor', 'has_key', 'has_value', 'each', 'map', 'select', 'reject', 'reduce', 'inject', 'sort', 'uniq', 'flatten', 'compact', 'empty', 'nil', 'size', 'length', 'count', 'first', 'last', 'push', 'pop', 'shift', 'unshift', 'delete', 'gsub', 'sub', 'match', 'scan', 'split', 'join', 'strip', 'chomp', 'upcase', 'downcase', 'capitalize', 'reverse', 'to_i', 'to_s', 'to_f', 'to_a', 'to_h', 'is_a', 'instance_of', 'respond_to', 'send', 'method', 'public_send', 'new', 'initialize', 'inherited', 'method_missing', 'const_get', 'const_set', 'define_method', 'class_eval', 'instance_eval'],
      snippets: [
        { prefix: 'def', body: ['def ${1:name}', '    ${2}', 'end'], description: 'Method definition' },
        { prefix: 'class', body: ['class ${1:Name}', '    def initialize(${2:params})', '        @${3:prop} = ${4:value}', '    end', 'end'], description: 'Class definition' },
        { prefix: 'if', body: ['if ${1:condition}', '    ${2}', 'end'], description: 'If statement' },
        { prefix: 'unless', body: ['unless ${1:condition}', '    ${2}', 'end'], description: 'Unless statement' },
        { prefix: 'each', body: ['${1:array}.each do |${2:item}|', '    ${3}', 'end'], description: 'Each loop' },
        { prefix: 'map', body: ['${1:array}.map { |${2:item}| ${3:item.${4:transform}} }'], description: 'Map transform' },
        { prefix: 'select', body: ['${1:array}.select { |${2:item}| ${3:condition} }'], description: 'Select filter' },
        { prefix: 'reduce', body: ['${1:array}.reduce(${2:initial}) { |${3:acc}, ${4:item}| ${5:acc + item} }'], description: 'Reduce' },
        { prefix: 'begin', body: ['begin', '    ${1}', 'rescue ${2:StandardError} => ${3:e}', '    ${4:puts e.message}', 'end'], description: 'Begin-rescue block' },
        { prefix: 'module', body: ['module ${1:Name}', '    def ${2:method}', '        ${3}', '    end', 'end'], description: 'Module definition' },
        { prefix: 'attr', body: ['attr_reader :${1:name}', 'attr_writer :${1:name}', 'attr_accessor :${1:name}'], description: 'Attribute accessors' },
        { prefix: 'hash', body: ['{ ${1:key}: ${2:value} }'], description: 'Hash literal' },
        { prefix: 'sym', body: [':${1:symbol}'], description: 'Symbol' },
        { prefix: 'lambda', body: ['-> (${1:params}) { ${2:body} }'], description: 'Lambda' },
        { prefix: 'proc', body: ['Proc.new { |${1:param}| ${2:body} }'], description: 'Proc' },
        { prefix: 'require', body: ['require \'${1:library}\''], description: 'Require library' },
        { prefix: 'include', body: ['include ${1:Module}'], description: 'Include module' },
        { prefix: 'raise', body: ['raise \'${1:error message}\''], description: 'Raise exception' },
        { prefix: 'main', body: ['if __FILE__ == $PROGRAM_NAME', '    ${1}', 'end'], description: 'Main guard' },
        { prefix: 'times', body: ['${1:n}.times do', '    ${2}', 'end'], description: 'Times loop' },
      ],
      commentStyle: '#',
      stringQuotes: ["'", '"'],
      indentation: 2,
    })
  }

  private registerPHP(): void {
    this.languages.set('php', {
      id: 'php',
      name: 'PHP',
      extensions: ['php'],
      keywords: ['<?php', '?>', 'echo', 'print', 'function', 'class', 'interface', 'trait', 'abstract', 'final', 'public', 'private', 'protected', 'static', 'const', 'var', 'return', 'if', 'else', 'elseif', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'clone', 'throw', 'try', 'catch', 'finally', 'namespace', 'use', 'require', 'require_once', 'include', 'include_once', 'global', 'static', 'self', 'parent', 'this', 'array', 'true', 'false', 'null', 'void', 'int', 'float', 'string', 'bool', 'mixed', 'never', 'iterable', 'callable', 'instanceof', 'match', 'enum', 'readonly', 'declare', 'strict_types', 'default', 'fn', 'yield', 'from', 'list', 'unset', 'isset', 'empty', 'die', 'exit', 'eval', 'defined', 'define'],
      builtins: ['array_map', 'array_filter', 'array_reduce', 'array_merge', 'array_keys', 'array_values', 'array_push', 'array_pop', 'array_shift', 'array_unshift', 'array_slice', 'array_splice', 'count', 'in_array', 'explode', 'implode', 'str_replace', 'preg_match', 'preg_replace', 'substr', 'strlen', 'strpos', 'strtolower', 'strtoupper', 'trim', 'json_encode', 'json_decode', 'serialize', 'unserialize', 'file_get_contents', 'file_put_contents', 'fopen', 'fwrite', 'fclose', 'fgets', 'mkdir', 'rmdir', 'unlink', 'file_exists', 'is_dir', 'is_file', 'scandir', 'header', 'session_start', 'session_destroy', 'setcookie', 'curl_init', 'curl_exec', 'curl_close', 'PDO', 'mysqli', 'DateTime', 'Exception', 'Error', 'ErrorException', 'Throwable'],
      snippets: [
        { prefix: 'fn', body: ['function ${1:name}(${2:params}) {', '    ${3:return ${4:value};}', '}'], description: 'Function declaration' },
        { prefix: 'class', body: ['class ${1:Name} {', '    public function __construct(${2:params}) {', '        $this->${3:prop} = ${4:value};', '    }', '}'], description: 'Class declaration' },
        { prefix: 'if', body: ['if (${1:condition}) {', '    ${2}', '}'], description: 'If statement' },
        { prefix: 'foreach', body: ['foreach ($${1:array} as $${2:key} => $${3:value}) {', '    ${4}', '}'], description: 'Foreach loop' },
        { prefix: 'for', body: ['for ($${1:i} = 0; $${1:i} < ${2:n}; $${1:i}++) {', '    ${3}', '}'], description: 'For loop' },
        { prefix: 'try', body: ['try {', '    ${1}', '} catch (${2:Exception} $${3:e}) {', '    echo $${3:e}->getMessage();', '}'], description: 'Try-catch block' },
        { prefix: 'echo', body: ['echo ${1:value};'], description: 'Echo statement' },
        { prefix: 'var', body: ['$${1:var} = ${2:value};'], description: 'Variable assignment' },
        { prefix: 'iface', body: ['interface ${1:Name} {', '    public function ${2:method}(${3:params});', '}'], description: 'Interface declaration' },
        { prefix: 'trait', body: ['trait ${1:Name} {', '    public function ${2:method}() {', '        ${3}', '    }', '}'], description: 'Trait declaration' },
        { prefix: 'namespace', body: ['namespace ${1:App}\\${2:Module};'], description: 'Namespace declaration' },
        { prefix: 'use', body: ['use ${1:Namespace}\\${2:Class};'], description: 'Use statement' },
        { prefix: 'arr', body: ['[${1:key} => ${2:value}]'], description: 'Array literal' },
        { prefix: 'json', body: ['json_encode(${1:data})'], description: 'JSON encode' },
        { prefix: 'pdo', body: ['$${1:pdo} = new PDO("mysql:host=${2:localhost};dbname=${3:db}", $${4:user}, $${5:pass});'], description: 'PDO connection' },
        { prefix: 'match', body: ['match (${1:value}) {', '    ${2:pattern} => ${3:result},', '    default => ${4:default},', '};'], description: 'Match expression' },
        { prefix: 'enum', body: ['enum ${1:Name}: ${2:string} {', '    case ${3:VALUE} = \'${4:value}\';', '}'], description: 'Enum declaration' },
        { prefix: 'arrow', body: ['fn(${1:params}) => ${2:expression}'], description: 'Arrow function' },
        { prefix: 'getset', body: ['public function get${1:Property}(): ${2:type} {', '    return $this->${3:property};', '}', '', 'public function set${1:Property}(${2:type} $${3:property}): void {', '    $this->${3:property} = $${3:property};', '}'], description: 'Getter and setter' },
        { prefix: 'construct', body: ['public function __construct(private readonly ${1:type} $${2:prop}) {', '}'], description: 'Constructor promotion' },
      ],
      commentStyle: '//',
      stringQuotes: ["'", '"'],
      indentation: 4,
    })
  }

  private registerSwift(): void {
    this.languages.set('swift', {
      id: 'swift',
      name: 'Swift',
      extensions: ['swift'],
      keywords: ['func', 'var', 'let', 'class', 'struct', 'enum', 'protocol', 'extension', 'import', 'return', 'if', 'else', 'guard', 'for', 'in', 'while', 'repeat', 'switch', 'case', 'default', 'break', 'continue', 'throw', 'try', 'catch', 'defer', 'where', 'as', 'is', 'self', 'super', 'nil', 'true', 'false', 'open', 'public', 'internal', 'fileprivate', 'private', 'static', 'class', 'mutating', 'nonmutating', 'required', 'optional', 'override', 'convenience', 'dynamic', 'final', 'lazy', 'weak', 'unowned', 'indirect', 'throws', 'rethrows', 'async', 'await', 'actor', 'nonisolated', 'isolated', 'consuming', 'borrowing', 'some', 'any', 'inout', 'repeat', 'associatedtype', 'typealias', 'subscript', 'willSet', 'didSet', 'get', 'set'],
      builtins: ['print', 'String', 'Int', 'Double', 'Float', 'Bool', 'Array', 'Dictionary', 'Set', 'Optional', 'Character', 'Data', 'Date', 'URL', 'UUID', 'IndexPath', 'NSObject', 'Any', 'AnyObject', 'Codable', 'Encodable', 'Decodable', 'Equatable', 'Hashable', 'Comparable', 'Identifiable', 'CustomStringConvertible', 'Error', 'Result', 'Task', 'AsyncStream', 'AsyncSequence', 'MainActor', 'GlobalActor', 'Sendable', 'Sequence', 'Collection', 'IteratorProtocol', 'AsyncSequence', 'AsyncIteratorProtocol'],
      snippets: [
        { prefix: 'func', body: ['func ${1:name}(${2:params}) -> ${3:returnType} {', '    ${4:return ${5:value}}', '}'], description: 'Function declaration' },
        { prefix: 'class', body: ['class ${1:Name} {', '    init(${2:params}) {', '        self.${3:prop} = ${4:value}', '    }', '}'], description: 'Class declaration' },
        { prefix: 'struct', body: ['struct ${1:Name} {', '    let ${2:prop}: ${3:type}', '}'], description: 'Struct declaration' },
        { prefix: 'enum', body: ['enum ${1:Name} {', '    case ${2:value1}', '    case ${3:value2}', '}'], description: 'Enum declaration' },
        { prefix: 'protocol', body: ['protocol ${1:Name} {', '    func ${2:method}()', '}'], description: 'Protocol declaration' },
        { prefix: 'extension', body: ['extension ${1:Type} {', '    ${2:func ${3:method}() {', '        ${4}', '    }}', '}'], description: 'Extension' },
        { prefix: 'if', body: ['if ${1:condition} {', '    ${2}', '}'], description: 'If statement' },
        { prefix: 'guard', body: ['guard ${1:condition} else {', '    ${2:return}', '}'], description: 'Guard statement' },
        { prefix: 'for', body: ['for ${1:item} in ${2:collection} {', '    ${3}', '}'], description: 'For-in loop' },
        { prefix: 'switch', body: ['switch ${1:value} {', 'case ${2:pattern}:', '    ${3}', 'default:', '    ${4}', '}'], description: 'Switch statement' },
        { prefix: 'do', body: ['do {', '    try ${1:expression}', '} catch {', '    ${2:print(error)}', '}'], description: 'Do-catch block' },
        { prefix: 'defer', body: ['defer {', '    ${1:cleanup}', '}'], description: 'Defer block' },
        { prefix: 'let', body: ['let ${1:name} = ${2:value}'], description: 'Constant declaration' },
        { prefix: 'var', body: ['var ${1:name} = ${2:value}'], description: 'Variable declaration' },
        { prefix: 'iflet', body: ['if let ${1:value} = ${2:optional} {', '    ${3}', '}'], description: 'If-let binding' },
        { prefix: 'guardlet', body: ['guard let ${1:value} = ${2:optional} else {', '    ${3:return}', '}', '${4}'], description: 'Guard-let binding' },
        { prefix: 'map', body: ['${1:collection}.map { ${2:item} in', '    ${3:item.${4:transform}}', '}'], description: 'Map closure' },
        { prefix: 'filter', body: ['${1:collection}.filter { ${2:item} in', '    ${3:condition}', '}'], description: 'Filter closure' },
        { prefix: 'structcodable', body: ['struct ${1:Name}: Codable {', '    let ${2:prop}: ${3:type}', '}'], description: 'Codable struct' },
        { prefix: 'enumresult', body: ['enum ${1:Result} {', '    case success(${2:value})', '    case failure(${3:Error})', '}'], description: 'Result enum' },
      ],
      commentStyle: '//',
      stringQuotes: ['"'],
      indentation: 4,
    })
  }

  private registerKotlin(): void {
    this.languages.set('kotlin', {
      id: 'kotlin',
      name: 'Kotlin',
      extensions: ['kt', 'kts'],
      keywords: ['fun', 'val', 'var', 'class', 'object', 'companion', 'data', 'sealed', 'open', 'abstract', 'override', 'private', 'public', 'protected', 'internal', 'inline', 'suspend', 'return', 'if', 'else', 'when', 'for', 'while', 'do', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'import', 'package', 'as', 'is', 'in', '!in', '!is', 'null', 'true', 'false', 'this', 'super', 'init', 'constructor', 'by', 'delegate', 'get', 'set', 'field', 'value', 'reified', 'noinline', 'crossinline', 'tailrec', 'operator', 'infix', 'sealed', 'inner', 'enum', 'annotation', 'interface', 'typealias', 'expect', 'actual'],
      builtins: ['println', 'print', 'String', 'Int', 'Long', 'Double', 'Float', 'Boolean', 'Char', 'Byte', 'Short', 'Unit', 'Nothing', 'Any', 'Any?', 'Nothing?', 'Unit', 'Array', 'List', 'MutableList', 'ArrayList', 'Set', 'MutableSet', 'HashSet', 'Map', 'MutableMap', 'HashMap', 'Pair', 'Triple', 'Sequence', 'Iterable', 'Collection', 'Comparable', 'Comparator', 'Runnable', 'Callable', 'Thread', 'CoroutineScope', 'launch', 'async', 'runBlocking', 'withContext', 'delay', 'Channel', 'Flow', 'StateFlow', 'SharedFlow', 'MutableStateFlow', 'MutableSharedFlow'],
      snippets: [
        { prefix: 'fun', body: ['fun ${1:name}(${2:params}): ${3:returnType} {', '    return ${4:value}', '}'], description: 'Function declaration' },
        { prefix: 'class', body: ['class ${1:Name}(${2:params}) {', '    init {', '        ${3}', '    }', '}'], description: 'Class declaration' },
        { prefix: 'data', body: ['data class ${1:Name}(', '    val ${2:prop}: ${3:type}', ')'], description: 'Data class' },
        { prefix: 'if', body: ['if (${1:condition}) {', '    ${2}', '}'], description: 'If statement' },
        { prefix: 'when', body: ['when (${1:value}) {', '    ${2:pattern} -> ${3:result}', '    else -> ${4:default}', '}'], description: 'When expression' },
        { prefix: 'for', body: ['for (${1:item} in ${2:collection}) {', '    ${3}', '}'], description: 'For loop' },
        { prefix: 'val', body: ['val ${1:name} = ${2:value}'], description: 'Read-only variable' },
        { prefix: 'var', body: ['var ${1:name} = ${2:value}'], description: 'Mutable variable' },
        { prefix: 'obj', body: ['object ${1:Name} {', '    val ${2:prop} = ${3:value}', '}'], description: 'Object declaration' },
        { prefix: 'companion', body: ['companion object {', '    const val ${1:NAME} = "${2:value}"', '}'], description: 'Companion object' },
        { prefix: 'sealed', body: ['sealed class ${1:Name} {', '    data class ${2:Sub}(${3:params}) : ${1:Name}()', '}'], description: 'Sealed class' },
        { prefix: 'iface', body: ['interface ${1:Name} {', '    fun ${2:method}()', '}'], description: 'Interface declaration' },
        { prefix: 'enum', body: ['enum class ${1:Name} {', '    ${2:VALUE1},', '    ${3:VALUE2}', '}'], description: 'Enum class' },
        { prefix: 'suspend', body: ['suspend fun ${1:name}(${2:params}): ${3:returnType} {', '    return withContext(Dispatchers.${4:IO}) {', '        ${5:result}', '    }', '}'], description: 'Suspend function' },
        { prefix: 'launch', body: ['lifecycleScope.launch {', '    ${1}', '}'], description: 'Coroutine launch' },
        { prefix: 'flow', body: ['flow {', '    emit(${1:value})', '}.flowOn(Dispatchers.${2:IO})'], description: 'Flow builder' },
        { prefix: 'collect', body: ['${1:flow}.collect { ${2:value} ->', '    ${3}', '}'], description: 'Flow collect' },
        { prefix: 'nullsafe', body: ['${1:value}?.let {', '    ${2:it}', '} ?: run {', '    ${3:fallback}', '}'], description: 'Null-safe access' },
        { prefix: 'apply', body: ['${1:value}.apply {', '    ${2:property = ${3:value}}', '}'], description: 'Apply scope function' },
        { prefix: 'let', body: ['${1:value}.let { ${2:it} ->', '    ${3}', '}'], description: 'Let scope function' },
      ],
      commentStyle: '//',
      stringQuotes: ['"', '"""'],
      indentation: 4,
    })
  }

  private registerSQL(): void {
    this.languages.set('sql', {
      id: 'sql',
      name: 'SQL',
      extensions: ['sql', 'ddl', 'dml'],
      keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'CROSS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'AS', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'EXISTS', 'UNION', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'UNIQUE', 'CHECK', 'DEFAULT', 'AUTO_INCREMENT', 'INT', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DATE', 'DATETIME', 'TIMESTAMP', 'FLOAT', 'DOUBLE', 'DECIMAL', 'BIGINT', 'SMALLINT', 'TINYINT', 'BLOB', 'ENUM', 'CASCADE', 'RESTRICT', 'ASC', 'DESC', 'GRANT', 'REVOKE', 'TRUNCATE', 'EXPLAIN', 'DESCRIBE', 'SHOW', 'USE', 'DATABASE'],
      builtins: ['NOW', 'CURDATE', 'CURTIME', 'DATE', 'TIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'DATE_FORMAT', 'DATEDIFF', 'DATE_ADD', 'DATE_SUB', 'CONCAT', 'SUBSTRING', 'LENGTH', 'TRIM', 'UPPER', 'LOWER', 'REPLACE', 'LOCATE', 'LEFT', 'RIGHT', 'ROUND', 'CEIL', 'FLOOR', 'ABS', 'COALESCE', 'IFNULL', 'NULLIF', 'CAST', 'CONVERT', 'GROUP_CONCAT', 'JSON_EXTRACT', 'JSON_UNQUOTE', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LEAD', 'LAG', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE', 'CURRENT_TIMESTAMP', 'UTC_TIMESTAMP', 'UNIX_TIMESTAMP', 'FROM_UNIXTIME'],
      snippets: [
        { prefix: 'select', body: ['SELECT ${1:columns}', 'FROM ${2:table}', 'WHERE ${3:condition}'], description: 'SELECT query' },
        { prefix: 'insert', body: ['INSERT INTO ${1:table} (${2:columns})', 'VALUES (${3:values})'], description: 'INSERT statement' },
        { prefix: 'update', body: ['UPDATE ${1:table}', 'SET ${2:column} = ${3:value}', 'WHERE ${4:condition}'], description: 'UPDATE statement' },
        { prefix: 'delete', body: ['DELETE FROM ${1:table}', 'WHERE ${2:condition}'], description: 'DELETE statement' },
        { prefix: 'create', body: ['CREATE TABLE ${1:table} (', '    ${2:id} INT PRIMARY KEY AUTO_INCREMENT,', '    ${3:name} VARCHAR(255) NOT NULL', ')'], description: 'CREATE TABLE' },
        { prefix: 'join', body: ['SELECT ${1:columns}', 'FROM ${2:table1}', 'INNER JOIN ${3:table2} ON ${4:condition}'], description: 'INNER JOIN' },
        { prefix: 'leftjoin', body: ['SELECT ${1:columns}', 'FROM ${2:table1}', 'LEFT JOIN ${3:table2} ON ${4:condition}'], description: 'LEFT JOIN' },
        { prefix: 'group', body: ['SELECT ${1:columns}, COUNT(*) as count', 'FROM ${2:table}', 'GROUP BY ${1:columns}', 'HAVING count > ${3:1}'], description: 'GROUP BY query' },
        { prefix: 'order', body: ['SELECT ${1:columns}', 'FROM ${2:table}', 'ORDER BY ${3:column} ${4:ASC}'], description: 'ORDER BY clause' },
        { prefix: 'subquery', body: ['SELECT ${1:columns}', 'FROM ${2:table}', 'WHERE ${3:column} IN (', '    SELECT ${4:sub_column}', '    FROM ${5:sub_table}', ')'], description: 'Subquery' },
        { prefix: 'cte', body: ['WITH ${1:cte_name} AS (', '    SELECT ${2:columns}', '    FROM ${3:table}', '    WHERE ${4:condition}', ')', 'SELECT * FROM ${1:cte_name}'], description: 'CTE (WITH clause)' },
        { prefix: 'window', body: ['SELECT ${1:columns},', '    ROW_NUMBER() OVER (PARTITION BY ${2:partition} ORDER BY ${3:order}) AS row_num', 'FROM ${4:table}'], description: 'Window function' },
        { prefix: 'index', body: ['CREATE INDEX idx_${1:column}', 'ON ${2:table} (${1:column})'], description: 'CREATE INDEX' },
        { prefix: 'view', body: ['CREATE VIEW ${1:view_name} AS', 'SELECT ${2:columns}', 'FROM ${3:table}', 'WHERE ${4:condition}'], description: 'CREATE VIEW' },
        { prefix: 'alter', body: ['ALTER TABLE ${1:table}', 'ADD ${2:column} ${3:type}'], description: 'ALTER TABLE' },
        { prefix: 'case', body: ['CASE', '    WHEN ${1:condition} THEN ${2:result}', '    ELSE ${3:default}', 'END'], description: 'CASE expression' },
        { prefix: 'union', body: ['SELECT ${1:columns} FROM ${2:table1}', 'UNION ${3:ALL}', 'SELECT ${1:columns} FROM ${4:table2}'], description: 'UNION query' },
        { prefix: 'transaction', body: ['BEGIN TRANSACTION;', '${1:queries}', 'COMMIT;'], description: 'Transaction' },
        { prefix: 'drop', body: ['DROP TABLE IF EXISTS ${1:table}'], description: 'DROP TABLE' },
        { prefix: 'truncate', body: ['TRUNCATE TABLE ${1:table}'], description: 'TRUNCATE TABLE' },
      ],
      commentStyle: '--',
      stringQuotes: ["'"],
      indentation: 4,
    })
  }

  private registerShell(): void {
    this.languages.set('shell', {
      id: 'shell',
      name: 'Shell',
      extensions: ['sh', 'bash', 'zsh'],
      keywords: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'in', 'function', 'return', 'exit', 'break', 'continue', 'source', 'export', 'local', 'readonly', 'unset', 'declare', 'typeset', 'alias', 'unalias', 'trap', 'exec', 'eval', 'set', 'shift', 'wait', 'sleep', 'test', '[', ']', '[[', ']]'],
      builtins: ['echo', 'printf', 'read', 'cd', 'pwd', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'sed', 'awk', 'find', 'sort', 'uniq', 'wc', 'head', 'tail', 'cut', 'tr', 'tee', 'xargs', 'chmod', 'chown', 'tar', 'gzip', 'gunzip', 'zip', 'unzip', 'curl', 'wget', 'ssh', 'scp', 'rsync', 'git', 'docker', 'npm', 'node', 'python', 'pip', 'make', 'env', 'which', 'whereis', 'ps', 'kill', 'top', 'df', 'du', 'free', 'date', 'basename', 'dirname', 'realpath', 'readlink'],
      snippets: [
        { prefix: 'fn', body: ['${1:name}() {', '    ${2:echo "hello"}', '}'], description: 'Function definition' },
        { prefix: 'if', body: ['if [[ ${1:condition} ]]; then', '    ${2}', 'fi'], description: 'If statement' },
        { prefix: 'for', body: ['for ${1:item} in ${2:list}; do', '    ${3}', 'done'], description: 'For loop' },
        { prefix: 'while', body: ['while [[ ${1:condition} ]]; do', '    ${2}', 'done'], description: 'While loop' },
        { prefix: 'case', body: ['case ${1:value} in', '    ${2:pattern})', '        ${3};;', '    *)', '        ${4:exit 1};;', 'esac'], description: 'Case statement' },
        { prefix: 'forfile', body: ['for ${1:file} in ${2:*.txt}; do', '    ${3:echo "Processing $${1:file}"}', 'done'], description: 'For loop over files' },
        { prefix: 'readfile', body: ['while IFS= read -r ${1:line}; do', '    ${2:echo "$${1:line}"}', 'done < "${3:file}"'], description: 'Read file line by line' },
        { prefix: 'checkerr', body: ['if [[ $? -ne 0 ]]; then', '    echo "Error: ${1:message}"', '    exit 1', 'fi'], description: 'Error check' },
        { prefix: 'heredoc', body: ['cat << EOF', '${1:content}', 'EOF'], description: 'Here document' },
        { prefix: 'default', body: ['${1:var}=${2:default:-"${3:fallback}"}'], description: 'Default value' },
        { prefix: 'substring', body: ['${1:var:${2:offset}:${3:length}}'], description: 'Substring' },
        { prefix: 'array', body: ['${1:arr}=(${2:values})', 'echo "$${1:arr[0]}"'], description: 'Array declaration' },
        { prefix: 'getopts', body: ['while getopts "${1:ab}:c:" opt; do', '    case $opt in', '        ${2:a})', '            ${3:echo "Option a"};;', '        \\?)', '            echo "Invalid option"', '            exit 1;;', '    esac', 'done'], description: 'Getopts argument parsing' },
        { prefix: 'args', body: ['echo "Script: $0"', 'echo "Args: $@"', 'echo "Count: $#"'], description: 'Argument handling' },
        { prefix: 'header', body: ['#!/bin/bash', 'set -euo pipefail', 'IFS=$\'\\n\\t\'', '# ${1:description}'], description: 'Script header with safety' },
      ],
      commentStyle: '#',
      stringQuotes: ["'", '"'],
      indentation: 4,
    })
  }

  private registerHTML(): void {
    this.languages.set('html', {
      id: 'html',
      name: 'HTML',
      extensions: ['html', 'htm', 'xhtml'],
      keywords: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'select', 'option', 'textarea', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'footer', 'nav', 'main', 'section', 'article', 'aside', 'figure', 'figcaption', 'video', 'audio', 'canvas', 'svg', 'script', 'style', 'link', 'meta', 'title', 'doctype'],
      builtins: ['document', 'window', 'console', 'Math', 'JSON', 'fetch', 'localStorage', 'sessionStorage', 'Element', 'Node', 'HTMLElement', 'Event', 'MouseEvent', 'KeyboardEvent', 'Promise', 'XMLHttpRequest', 'FormData', 'URL', 'History', 'Location', 'Navigator', 'Screen', 'Performance', 'IntersectionObserver', 'ResizeObserver', 'MutationObserver', 'AbortController', 'AbortSignal'],
      snippets: [
        { prefix: 'html5', body: ['<!DOCTYPE html>', '<html lang="zh-CN">', '<head>', '    <meta charset="UTF-8">', '    <meta name="viewport" content="width=device-width, initial-scale=1.0">', '    <title>${1:Document}</title>', '</head>', '<body>', '    ${2:content}', '</body>', '</html>'], description: 'HTML5 skeleton' },
        { prefix: 'div', body: ['<div class="${1:class}">', '    ${2:content}', '</div>'], description: 'Div element' },
        { prefix: 'a', body: ['<a href="${1:url}" target="_blank" rel="noopener noreferrer">${2:link}</a>'], description: 'Anchor link' },
        { prefix: 'img', body: ['<img src="${1:src}" alt="${2:description}" loading="lazy">'], description: 'Image element' },
        { prefix: 'form', body: ['<form action="${1:action}" method="${2:POST}">', '    ${3:inputs}', '    <button type="submit">${4:Submit}</button>', '</form>'], description: 'Form element' },
        { prefix: 'input', body: ['<input type="${1:text}" name="${2:name}" placeholder="${3:placeholder}" ${4:required}>'], description: 'Input element' },
        { prefix: 'select', body: ['<select name="${1:name}">', '    <option value="">${2:Select...</option>', '    <option value="${3:value}">${4:Option}</option>', '</select>'], description: 'Select element' },
        { prefix: 'table', body: ['<table class="${1:table}">', '    <thead>', '        <tr>', '            <th>${2:Header}</th>', '        </tr>', '    </thead>', '    <tbody>', '        <tr>', '            <td>${3:Data}</td>', '        </tr>', '    </tbody>', '</table>'], description: 'Table element' },
        { prefix: 'list', body: ['<ul>', '    <li>${1:item}</li>', '    <li>${2:item}</li>', '</ul>'], description: 'Unordered list' },
        { prefix: 'script', body: ['<script>', '    ${1:console.log("Hello")}', '</script>'], description: 'Script tag' },
        { prefix: 'style', body: ['<style>', '    .${1:class} {', '        ${2:property}: ${3:value};', '    }', '</style>'], description: 'Style tag' },
        { prefix: 'meta', body: ['<meta name="${1:description}" content="${2:content}">'], description: 'Meta tag' },
        { prefix: 'link', body: ['<link rel="stylesheet" href="${1:style.css}">'], description: 'Link stylesheet' },
        { prefix: 'nav', body: ['<nav>', '    <ul>', '        <li><a href="${1:#}">${2:Home}</a></li>', '    </ul>', '</nav>'], description: 'Navigation element' },
        { prefix: 'header', body: ['<header>', '    <h1>${1:Title}</h1>', '    <p>${2:Subtitle}</p>', '</header>'], description: 'Header element' },
        { prefix: 'footer', body: ['<footer>', '    <p>&copy; ${1:2024} ${2:Company}</p>', '</footer>'], description: 'Footer element' },
        { prefix: 'section', body: ['<section id="${1:section}">', '    <h2>${2:Title}</h2>', '    ${3:content}', '</section>'], description: 'Section element' },
        { prefix: 'video', body: ['<video controls width="${1:640}">', '    <source src="${2:video.mp4}" type="video/mp4">', '    Your browser does not support video.', '</video>'], description: 'Video element' },
        { prefix: 'iframe', body: ['<iframe src="${1:url}" width="${2:600}" height="${3:400}" frameborder="0" allowfullscreen></iframe>'], description: 'Iframe element' },
        { prefix: 'details', body: ['<details>', '    <summary>${1:Title}</summary>', '    ${2:content}', '</details>'], description: 'Details element' },
      ],
      commentStyle: '<!--',
      stringQuotes: ['"', "'"],
      indentation: 4,
    })
  }

  private registerCSS(): void {
    this.languages.set('css', {
      id: 'css',
      name: 'CSS',
      extensions: ['css', 'scss', 'sass', 'less'],
      keywords: ['display', 'position', 'width', 'height', 'margin', 'padding', 'border', 'color', 'background', 'font-size', 'font-weight', 'font-family', 'text-align', 'text-decoration', 'line-height', 'overflow', 'flex', 'grid', 'align-items', 'justify-content', 'gap', 'z-index', 'opacity', 'transition', 'transform', 'animation', 'box-shadow', 'border-radius', 'cursor', 'float', 'clear', 'visibility', 'white-space', 'word-break', 'box-sizing', 'outline', 'list-style', 'table-layout', 'vertical-align'],
      builtins: [
        'red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'lightgray', 'darkgray',
        'transparent', 'currentColor', 'inherit', 'initial', 'unset',
        'flex', 'inline-flex', 'grid', 'inline-grid', 'block', 'inline-block', 'inline', 'none',
        'relative', 'absolute', 'fixed', 'sticky', 'static',
        'row', 'column', 'wrap', 'nowrap', 'center', 'start', 'end', 'space-between', 'space-around', 'space-evenly',
        'auto', '100%', '100vh', '100vw', 'fit-content', 'max-content', 'min-content',
        'solid', 'dashed', 'dotted', 'double', 'none', 'hidden', 'scroll', 'visible',
        'italic', 'bold', 'normal', 'underline', 'overline', 'line-through',
        'cursive', 'monospace', 'serif', 'sans-serif',
        'repeat', 'no-repeat', 'cover', 'contain', 'center',
        'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear',
        'rotate', 'scale', 'translate', 'skew',
        'hover', 'focus', 'active', 'visited', 'first-child', 'last-child', 'nth-child', 'not', 'is', 'where', 'has',
      ],
      snippets: [
        { prefix: 'flex', body: ['display: flex;', 'align-items: center;', 'justify-content: center;'], description: 'Flexbox centering' },
        { prefix: 'flexcol', body: ['display: flex;', 'flex-direction: column;', 'align-items: center;'], description: 'Flexbox column' },
        { prefix: 'grid', body: ['display: grid;', 'grid-template-columns: repeat(${1:3}, 1fr);', 'gap: ${2:16}px;'], description: 'CSS Grid' },
        { prefix: 'media', body: ['@media (max-width: ${1:768}px) {', '    ${2:selector} {', '        ${3:property}: ${4:value};', '    }', '}'], description: 'Media query' },
        { prefix: 'keyframes', body: ['@keyframes ${1:name} {', '    0% {', '        ${2:opacity: 0;}', '    }', '    100% {', '        ${3:opacity: 1;}', '    }', '}'], description: 'Keyframes animation' },
        { prefix: 'transition', body: ['transition: ${1:property} ${2:0.3}s ${3:ease};'], description: 'Transition' },
        { prefix: 'shadow', body: ['box-shadow: 0 ${1:2}px ${2:4}px rgba(0, 0, 0, ${3:0.1});'], description: 'Box shadow' },
        { prefix: 'border', body: ['border: ${1:1}px solid ${2:#e0e0e0};', 'border-radius: ${3:8}px;'], description: 'Border shorthand' },
        { prefix: 'center', body: ['position: absolute;', 'top: 50%;', 'left: 50%;', 'transform: translate(-50%, -50%);'], description: 'Absolute centering' },
        { prefix: 'ellipsis', body: ['overflow: hidden;', 'text-overflow: ellipsis;', 'white-space: nowrap;'], description: 'Text ellipsis' },
        { prefix: 'aspect', body: ['aspect-ratio: ${1:16} / ${2:9};', 'object-fit: cover;'], description: 'Aspect ratio' },
        { prefix: 'clamp', body: ['font-size: clamp(${1:1rem}, ${2:2.5vw}, ${3:2rem});'], description: 'Clamp function' },
        { prefix: 'scrollbar', body: ['::-webkit-scrollbar {', '    width: ${1:8}px;', '}', '::-webkit-scrollbar-thumb {', '    background: ${2:#888};', '    border-radius: ${3:4}px;', '}'], description: 'Custom scrollbar' },
        { prefix: 'pseudo', body: ['&::${1:before} {', '    content: \'${2:}\';', '    ${3:position: absolute;}', '}'], description: 'Pseudo-element (SCSS)' },
        { prefix: 'var', body: ['--${1:name}: ${2:value};', 'var(--${1:name})'], description: 'CSS custom property' },
        { prefix: 'container', body: ['@container (min-width: ${1:400}px) {', '    ${2:selector} {', '        ${3:property}: ${4:value};', '    }', '}'], description: 'Container query' },
        { prefix: 'gradient', body: ['background: linear-gradient(${1:135}deg, ${2:#color1}, ${3:#color2});'], description: 'Linear gradient' },
        { prefix: 'filter', body: ['filter: brightness(${1:0.8}) contrast(${2:1.2}) saturate(${3:1.1});'], description: 'CSS filter' },
        { prefix: 'backdrop', body: ['backdrop-filter: blur(${1:10}px);', '-webkit-backdrop-filter: blur(${1:10}px);'], description: 'Backdrop filter' },
        { prefix: 'gridauto', body: ['grid-template-columns: repeat(auto-fit, minmax(${1:250}px, 1fr));'], description: 'Auto-fit grid' },
      ],
      commentStyle: '/*',
      stringQuotes: ['"', "'"],
      indentation: 2,
    })
  }
}