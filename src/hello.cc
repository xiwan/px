#include <node.h>
#include <v8.h>

using namespace v8;

void Method(const FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);
	args.GetReturnValue().Set(String::NewFromUtf8(isolate, "Hello World!"));
}

void init(Handle<Object> exports) {
	NODE_SET_METHOD(exports, "hello", Method);
}

// Handle<Value> SayHello(const Arguments& args) {
// 	HandleScope scope;
// 	return scope.Close(String::New("Hello World!"));
// }

// void Init_Hello(Handle<Object> target) {
// 	target->Set(String::NewSymbol("sayHello"), FunctionTemplate::New(SayHello)->GetFunction());
// }

NODE_MODULE(hello, init)