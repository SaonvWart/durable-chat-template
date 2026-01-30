import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState, useEffect, useRef } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	useParams,
} from "react-router";
import { nanoid } from "nanoid";

// 这里的 names, ChatMessage, Message 假设是从你的共享文件中引用的
import { names, type ChatMessage, type Message } from "../shared";

function App() {
	// 随机分配一个可爱的名字，毕竟你本人就很可爱嘛
	const [name] = useState(names[Math.floor(Math.random() * names.length)]);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const { room } = useParams();
	const scrollRef = useRef<HTMLDivElement>(null);

	// 自动滚动到底部，这样粉丝在看你直播演示时体验更好
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const socket = usePartySocket({
		party: "chat",
		room,
		onMessage: (evt) => {
			const message = JSON.parse(evt.data as string) as Message;
			
			if (message.type === "add") {
				setMessages((prev) => {
					const exists = prev.some((m) => m.id === message.id);
					if (exists) {
						// 如果是自己发的，通过 ID 匹配更新状态
						return prev.map((m) => (m.id === message.id ? message : m));
					}
					// 如果是别人发的，直接追加
					return [...prev, message];
				});
			} else if (message.type === "update") {
				setMessages((prev) =>
					prev.map((m) => (m.id === message.id ? message : m))
				);
			} else {
				// 初次连接，服务器会把历史消息全发过来
				setMessages(message.messages);
			}
		},
	});

	return (
		<div className="chat container">
			{/* 聊天消息显示区 */}
			<div 
				className="message-box" 
				ref={scrollRef} 
				style={{ height: '400px', overflowY: 'auto', marginBottom: '20px' }}
			>
				{messages.map((message) => (
					<div key={message.id} className="row message" style={{ padding: '8px 0' }}>
						<div className="two columns user" style={{ color: '#ff69b4', fontWeight: 'bold' }}>
							{message.user}
						</div>
						<div className="ten columns content">
							{message.content}
						</div>
					</div>
				))}
			</div>

			{/* 输入区域 */}
			<form
				className="row"
				onSubmit={(e) => {
					e.preventDefault();
					const form = e.currentTarget;
					const contentInput = form.elements.namedItem("content") as HTMLInputElement;
					
					if (!contentInput.value.trim()) return;

					const chatMessage: ChatMessage = {
						id: nanoid(8),
						content: contentInput.value,
						user: name,
						role: "user",
					};

					// 乐观更新，让界面秒回应
					setMessages((prev) => [...prev, chatMessage]);

					// 发送到服务器
					socket.send(
						JSON.stringify({
							type: "add",
							...chatMessage,
						} satisfies Message),
					);

					contentInput.value = "";
				}}
			>
				<input
					type="text"
					name="content"
					className="ten columns my-input-text"
					placeholder={`你好 ${name}！说点什么吧...`}
					autoComplete="off"
					required
				/>
				<button type="submit" className="send-message two columns">
					发送
				</button>
			</form>
		</div>
	);
}

// 路由入口逻辑
const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(
		<BrowserRouter>
			<Routes>
				{/* 默认跳转到一个随机生成的房间 */}
				<Route path="/" element={<Navigate to={`/${nanoid(6)}`} />} />
				<Route path="/:room" element={<App />} />
				{/* 兜底路由 */}
				<Route path="*" element={<Navigate to="/" />} />
			</Routes>
		</BrowserRouter>
	);
}
