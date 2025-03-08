# P2P Video Chat

**A lightweight peer-to-peer video chat application without servers in the middle.**

## Overview

P2P Video Chat is a WebRTC-powered application that enables direct browser-to-browser video communication. The application allows users to create and join chat rooms for real-time video conferencing without relying on traditional server-based infrastructure for media transfer.

## Features

- 🎥 **Real-time Video Chat**: Connect with peers via high-quality video and audio
- 🔗 **Shareable Room Links**: Generate unique room links to invite others
- 🔄 **P2P Connection**: Direct browser-to-browser communication for better privacy
- 🎚️ **Media Controls**: Easily toggle audio and video during calls
- 🌓 **Dark Mode**: Switch between light and dark themes for comfortable viewing
- ⚡ **Efficient**: Built with modern web technologies for optimal performance

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Recommended v16+)
- [pnpm](https://pnpm.io/) (or npm/yarn)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/sargentina/p2p-video-chat.git
   cd p2p-video-chat
   ```

2. Install dependencies:
   ```sh
   pnpm install
   ```

3. Start the development server:
   ```sh
   pnpm dev
   ```

4. Open the app in your browser at `http://localhost:3002`

5. (Requires backend to do the signaling.)

## Usage

1. **Create a Room**: Enter a room name (optional) and click "Create Room"
2. **Invite Others**: Share the generated room link with others to join your video chat
3. **Manage Settings**: Use the control buttons to toggle your microphone and camera
4. **Dark Mode**: Toggle dark mode using the checkbox in the sidebar

## Technical Details

This application uses WebRTC for establishing peer connections and transferring audio/video streams directly between browsers. Socket.IO is used for the initial signaling process to establish connections.

**Note:** This application primarily relies on direct peer-to-peer connections. It uses STUN servers to establish connections but does not use TURN servers for relayed connections. If you have a restrictive firewall or NAT setup, you may experience connectivity issues.

## Deployment

To build the application for production:

```sh
pnpm build
```

The built files will be in the `dist` directory and can be deployed to any static web hosting service.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

**Start video chatting directly with your peers today!**

