import styles from "../styles/Home.module.css";
import axios from "axios";
import { useState, useEffect } from "react";
import useContract from "../hooks/useContract";
import { patikaadress } from "../config";
import patikajson from "../build/contracts/Patika.json";
import useConnection from "../hooks/useConnection";
import { ethers } from "ethers";

export default function Home() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fileImg, setFileImg] = useState("");
  const [price, setPrice] = useState("");
  const [newOwners, setNewOwners] = useState({});

  const [nfts, setNfts] = useState([]);

  const contract = useContract(patikaadress, patikajson.abi);
  const connection = useConnection();

  //buraya pinatadan aldığınız apikey ve apisecretınızı yazın.
  //.env dosyası oluşturup bilgileri ordan çekerseniz daha profesyonel bi yaklaşım izlemiş olursunuz.
  const apikey = process.env.PINATA_API_KEY;
  const apisecret = process.env.PINATA_SECRET_API_KEY;

  //IPFS'e "dosya" yüklemek için bu fonksiyonu kullanıyoruz.
  const sendFileToIPFS = async (e) => {
    e.preventDefault();
    if (e.target.files[0]) {
      try {
        const formData = new FormData();
        formData.append("file", e.target.files[0]);
        const resFile = await axios({
          method: "post",
          url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
          data: formData,
          headers: {
            pinata_api_key: apikey,
            pinata_secret_api_key: apisecret,
            "Content-Type": "multipart/form-data",
          },
        });
        console.log(resFile);
        const ImgUrl = `https://cloudflare-ipfs.com/ipfs/${resFile.data.IpfsHash}`;
        //console.log(resFile);
        setFileImg(ImgUrl);
        //Take a look at your Pinata Pinned section, you will see a new file added to you list.
      } catch (error) {
        console.log("Error sending File to IPFS: ");
        console.log(error);
      }
    }
  };

  //IPFS'e JSON yüklemek için bu fonksiyonu kullanıyoruz.
  const sendJSONtoIPFS = async (e) => {
    e.preventDefault();
    try {
      const resJSON = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinJsonToIPFS",
        //IPFS'e yükleyeceğimiz nesneyi json formatında oluşturuyoruz.
        data: {
          name: name,
          description: description,
          image: fileImg,
        },
        headers: {
          pinata_api_key: apikey,
          pinata_secret_api_key: apisecret,
        },
      });

      console.log(
        "final ",
        `https://cloudflare-ipfs.com/ipfs/${resJSON.data.IpfsHash}`
      );

      //safeMint fonksiyonunu dersin sonunda payable hale getirdik.
      //payable fonksiyonlara işlem gönderirken ether ataçlayabilmek için "value" keywordünü kullanıyoruz.
      //price state'inin değeri miktarınca ether kontrata gönderiliyor.
      await contract.safeMint(
        `https://cloudflare-ipfs.com/ipfs/${resJSON.data.IpfsHash}`,
        {
          value: ethers.utils.parseEther(price),
        }
      );
    } catch (error) {
      console.log("JSON to IPFS: ");
      console.log(error);
    }
  };

  //NFT'nin sahibi değiştirmek yani transfer etmek için kullanıyoruz.
  const transferOwnershipOfNFT = async (e) => {
    e.preventDefault();
    try {
      await contract.transferFrom(
        nfts[e.target.id].owner,
        newOwners[e.target.id],
        e.target.id
      );

      console.log("NFT has been transferred to: ", newOwners[e.target.id]);
    } catch (error) {
      console.log("JSON to IPFS: ");
      console.log(error);
    }
  };

  useEffect(() => {
    connection.connect();
    if (connection.address) {
      getNFTs();
    }
  }, [connection.address]);

  const getNFTs = async () => {
    //toplam nft sayısını kontrattan çekiyoruz.
    const nftCount = await contract.totalSupply();

    //her bir nftnin tokenURI'nı elde ederek axios ile fetch ediyoruz.
    for (let i = 0; i < nftCount; i++) {
      let uri = await contract.tokenURI(i);
      let owner = await contract.ownerOf(i);
      let data = await axios.get(uri);
      //her bir nft'nin metadasını bir nesne haline getirerek "nfts" stateimize ekliyoruz.
      let item = {
        name: data.data.name,
        description: data.data.description,
        image: data.data.image,
        owner: owner,
      };
      setNfts((nfts) => [...nfts, item]);
      console.log(item);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Patika NFT Minting App</h1>
      <div className={styles.mintNFT}>
        <form className={styles.form} onSubmit={sendJSONtoIPFS}>
          <label className={'form-label ' + styles.labels}>
            Name
          </label>
          <input
            className={'form-control ' + styles.inputs}
            placeholder="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <br />
          <label className={'form-label ' + styles.labels}>
            Description
          </label>
          <textarea
            className={styles.inputs}
            placeholder="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <br />
          <label className={'form-label ' + styles.labels}>
            Price
          </label>
          <input
            className={'form-control ' + styles.inputs}
            placeholder="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <br />
          <input type={"file"} onChange={sendFileToIPFS} />
          <br />
          {fileImg && <img width="200px" src={fileImg} />}
          <br />
          <button
            type="submit"
            className={styles.buttons}
          >
            MINT
          </button>
        </form>
      </div>
      {nfts.length > 0 && (
        <div className={styles.listNFT}>
          {/* nfts state'imizde bulunan her bir nftnin metadata bilgilerini kullanıcıya aktarıyoruz. */}
          {nfts.map((item, i) => (
            <div
              key={i}
              className="rounded overflow-hidden my-2 p-6 w-56 h-auto shadow-xl bg-[#282c34]"
            >
              <img className="w-52 h-auto rounded" src={item.image} alt={item.name} />
              <div className="px-3 py-1">
                <div className="font-bold text-base mb-2">{item.name}</div>
                <p className="text-[#695CFE] text-base">{item.description}</p>
                <div className="font-bold text-base mb-2">
                  Owner:
                  {` ${item.owner.substring(0, 5)}...${item.owner.substring(
                    item.owner.length - 5,
                    item.owner.length - 1
                  )}`}
                </div>
              </div>
              <details>
                <summary className="font-bold text-base mb-2">
                  Transfer Your NFT
                </summary>
                <div className="block p-6 rounded-lg shadow-lg bg-[#F2EDE7] max-w-sm">
                  <form id={i} onSubmit={transferOwnershipOfNFT}>
                    <div className="form-group mb-6">
                      <label className="form-label inline-block mb-2 text-base text-gray-700">
                        Transfer address
                      </label>
                      <input
                        className={'form-control ' + styles.inputs}
                        id={i}
                        value={newOwners[i] ?? ""}
                        placeholder="Enter address"
                        onChange={async (e) => {
                          e.preventDefault();
                          // 0x8207edBc86AaF374f52B26477e6A3D5252a5BfF3
                          newOwners[i] = e.target.value;
                          setNewOwners({ ...newOwners });
                          console.log(newOwners);
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      className={styles.buttons}
                    >
                      Transfer
                    </button>
                  </form>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
